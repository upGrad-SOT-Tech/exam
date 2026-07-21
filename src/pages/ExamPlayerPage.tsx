import { useCallback, useEffect, useRef, useState } from 'react'
import { logoUrl } from '@/assets/brand'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getExam, saveExamAnswer, submitExamAttempt, submitProctorEvents } from '@/lib/exams/api'
import { createAttemptSocket, emitProctorEvent } from '@/lib/exams/socket'
import type { Exam, ExamAnswerMap, ExamSubmission } from '@/lib/exams/types'
import { endLockdown, startLockdown, subscribeProctorEvents } from '@/lib/proctoring/api'
import type { ProctorEvent } from '@/lib/proctoring/types'
import { VideoProctorMonitor } from '@/lib/video-proctoring/monitor'
import type { VideoProctorFinding } from '@/lib/vision/types'
import { useCalibrationStore } from '@/store/calibrationStore'
import type { Socket } from 'socket.io-client'

type BatteryManager = EventTarget & {
  level: number
  charging: boolean
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function waitForVideoReady(video: HTMLVideoElement) {
  if (video.readyState >= 2) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error('Camera preview did not start'))
    }, 5_000)
    const cleanup = () => {
      window.clearTimeout(timeout)
      video.removeEventListener('loadedmetadata', ready)
      video.removeEventListener('canplay', ready)
    }
    const ready = () => {
      cleanup()
      resolve()
    }
    video.addEventListener('loadedmetadata', ready)
    video.addEventListener('canplay', ready)
  })
}

async function requestCamera() {
  const primary = navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    audio: false,
  })
  const timeout = new Promise<never>((_, reject) => {
    window.setTimeout(() => reject(new Error('Camera request timed out')), 7_000)
  })

  try {
    return await Promise.race([primary, timeout])
  } catch {
    return navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  }
}

export default function ExamPlayerPage() {
  const { examId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const attemptId = searchParams.get('attemptId') ?? ''
  const profile = useCalibrationStore((state) => state.profile)
  const [exam, setExam] = useState<Exam | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<ExamAnswerMap>({})
  const [events, setEvents] = useState<ProctorEvent[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submission, setSubmission] = useState<ExamSubmission | null>(null)
  const [lockdownReady, setLockdownReady] = useState(false)
  const [lockdownError, setLockdownError] = useState<string | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const [videoStatus, setVideoStatus] = useState('Starting camera…')
  const [liveVideoAlert, setLiveVideoAlert] = useState<{
    type: string
    details?: Record<string, unknown>
  } | null>(null)
  const [uploadStats, setUploadStats] = useState({
    queued: 0,
    inflight: 0,
    uploaded: 0,
    failed: 0,
    dropped: 0,
  })
  const fallbackEventsRef = useRef<ProctorEvent[]>([])
  const socketRef = useRef<Socket | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const monitorRef = useRef<VideoProctorMonitor | null>(null)
  const submittingRef = useRef(false)
  const liveAlertClearTimerRef = useRef<number | null>(null)
  const currentIndexRef = useRef(0)
  const examRef = useRef<Exam | null>(null)

  currentIndexRef.current = currentIndex
  examRef.current = exam

  const currentQuestion = exam?.questions[currentIndex]
  const answeredCount = Object.keys(answers).length

  /** System alerts stay briefly; video face alerts use liveVideoAlert and clear when face returns. */
  const recentSystemAlert = events.find((event) => {
    if (
      ![
        'another_app_active',
        'focus_lost',
        'window_minimized',
        'screen_locked',
        'laptop_suspend',
        'screen_capture_attempted',
        'screen_recording_detected',
        'proctor_webcam_failed',
        'proctor_screenshot_failed',
      ].includes(event.type)
    ) {
      return false
    }
    return Date.now() - new Date(event.occurredAt).getTime() < 8_000
  })

  const bannerAlert = liveVideoAlert
    ? { type: liveVideoAlert.type, details: liveVideoAlert.details }
    : recentSystemAlert
      ? { type: recentSystemAlert.type, details: recentSystemAlert.details }
      : null

  const setTransientVideoAlert = useCallback(
    (type: string, details?: Record<string, unknown>, sticky = false) => {
      setLiveVideoAlert({ type, details })
      if (liveAlertClearTimerRef.current) {
        window.clearTimeout(liveAlertClearTimerRef.current)
        liveAlertClearTimerRef.current = null
      }
      if (!sticky) {
        liveAlertClearTimerRef.current = window.setTimeout(() => {
          setLiveVideoAlert((current) => (current?.type === type ? null : current))
          liveAlertClearTimerRef.current = null
        }, 6_000)
      }
    },
    [],
  )

  const sendEvent = useCallback(
    (event: ProctorEvent) => {
      setEvents((items) => [event, ...items].slice(0, 20))
      const activeSocket = socketRef.current
      if (activeSocket?.connected) {
        emitProctorEvent(activeSocket, attemptId, event)
        return
      }
      fallbackEventsRef.current = [...fallbackEventsRef.current, event].slice(-100)
    },
    [attemptId],
  )

  const addLocalEvent = useCallback(
    (event: Omit<ProctorEvent, 'occurredAt'>) => {
      const nextEvent = { ...event, occurredAt: new Date().toISOString() }
      sendEvent(nextEvent)
    },
    [sendEvent],
  )

  const submitExam = useCallback(async () => {
    if (!attemptId || submitted || submittingRef.current) return

    submittingRef.current = true
    setSubmitting(true)
    setSubmitError(null)

    try {
      const result = await submitExamAttempt(attemptId)
      setSubmission(result)
      setSubmitted(true)
    } catch (error) {
      submittingRef.current = false
      setSubmitting(false)
      setSubmitError(error instanceof Error ? error.message : 'Unable to submit exam')
    }
  }, [attemptId, submitted])

  useEffect(() => {
    if (!examId) return
    let cancelled = false
    getExam(examId).then((item) => {
      if (cancelled) return
      setExam(item)
      setRemainingSeconds(item.durationSeconds)
    })
    return () => {
      cancelled = true
    }
  }, [examId])

  useEffect(() => {
    if (!attemptId) return
    const nextSocket = createAttemptSocket(attemptId)
    socketRef.current = nextSocket
    const heartbeat = window.setInterval(() => {
      nextSocket.emit('attempt:heartbeat', { attemptId })
    }, 10_000)
    return () => {
      window.clearInterval(heartbeat)
      if (socketRef.current === nextSocket) socketRef.current = null
      nextSocket.disconnect()
    }
  }, [attemptId])

  useEffect(() => {
    if (!attemptId) return
    const timer = window.setInterval(() => {
      const batch = fallbackEventsRef.current
      if (batch.length === 0) return
      fallbackEventsRef.current = []
      void submitProctorEvents(attemptId, batch)
    }, 5000)

    return () => {
      window.clearInterval(timer)
      const batch = fallbackEventsRef.current
      fallbackEventsRef.current = []
      if (batch.length > 0) void submitProctorEvents(attemptId, batch)
    }
  }, [attemptId])

  useEffect(() => {
    let disposed = false
    setLockdownReady(false)
    setLockdownError(null)

    void startLockdown().then((state) => {
      if (disposed) return
      if (state.active) {
        setLockdownReady(true)
      } else {
        setLockdownError('Secure fullscreen could not be enabled. Restart the exam application.')
        addLocalEvent({
          type: 'focus_lost',
          details: { reason: 'lockdown_start_failed' },
        })
      }
    }).catch((error) => {
      if (disposed) return
      setLockdownError(error instanceof Error ? error.message : 'Unable to enable secure fullscreen')
    })
    const unsubscribe = subscribeProctorEvents((event) => {
      sendEvent(event)
    })

    const block = (event: Event) => event.preventDefault()
    const blockWithEvent = (type: ProctorEvent['type'], event: Event) => {
      event.preventDefault()
      addLocalEvent({ type })
    }
    const blockKeys = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const meta = event.metaKey || event.ctrlKey
      const shift = event.shiftKey

      if (meta && shift && ['3', '4', '5', '6'].includes(key)) {
        event.preventDefault()
        addLocalEvent({
          type: 'screen_capture_attempted',
          details: { key: `meta+shift+${key}`, via: 'renderer' },
        })
        return
      }

      if (
        meta &&
        ['a', 'c', 'v', 'x', 'r', 'l', 'w', 'p', 's', 'o', 'n', 't', '[', ']', 'i'].includes(key)
      ) {
        event.preventDefault()
        const type: ProctorEvent['type'] =
          key === 'c'
            ? 'copy_blocked'
            : key === 'v'
              ? 'paste_blocked'
              : key === 'x'
                ? 'cut_blocked'
                : key === 'a'
                  ? 'select_blocked'
                  : 'shortcut_blocked'
        addLocalEvent({ type, details: { key: event.key, meta: true } })
      }
      if (key === 'f5' || key === 'printscreen' || key === 'f12') {
        event.preventDefault()
        addLocalEvent({
          type: key === 'printscreen' ? 'screen_capture_attempted' : 'shortcut_blocked',
          details: { key: event.key },
        })
      }
    }

    const visibilityChange = () => {
      addLocalEvent({ type: document.hidden ? 'visibility_hidden' : 'visibility_visible' })
    }
    const pageHide = () => addLocalEvent({ type: 'page_hidden' })
    const pageShow = () => addLocalEvent({ type: 'page_shown' })
    const contextMenu = (event: Event) => blockWithEvent('shortcut_blocked', event)
    const copy = (event: Event) => blockWithEvent('copy_blocked', event)
    const cut = (event: Event) => blockWithEvent('cut_blocked', event)
    const paste = (event: Event) => blockWithEvent('paste_blocked', event)
    const select = (event: Event) => blockWithEvent('select_blocked', event)
    const drag = (event: Event) => blockWithEvent('drag_blocked', event)

    document.documentElement.classList.add('exam-lockdown')
    window.addEventListener('contextmenu', contextMenu)
    window.addEventListener('copy', copy)
    window.addEventListener('cut', cut)
    window.addEventListener('paste', paste)
    window.addEventListener('selectstart', select)
    window.addEventListener('dragstart', drag)
    window.addEventListener('dragover', block)
    window.addEventListener('drop', block)
    window.addEventListener('keydown', blockKeys, true)
    document.addEventListener('visibilitychange', visibilityChange)
    window.addEventListener('pagehide', pageHide)
    window.addEventListener('pageshow', pageShow)
    addLocalEvent({ type: 'page_shown', details: { phase: 'exam_started' } })

    return () => {
      disposed = true
      unsubscribe()
      document.documentElement.classList.remove('exam-lockdown')
      window.removeEventListener('contextmenu', contextMenu)
      window.removeEventListener('copy', copy)
      window.removeEventListener('cut', cut)
      window.removeEventListener('paste', paste)
      window.removeEventListener('selectstart', select)
      window.removeEventListener('dragstart', drag)
      window.removeEventListener('dragover', block)
      window.removeEventListener('drop', block)
      window.removeEventListener('keydown', blockKeys, true)
      document.removeEventListener('visibilitychange', visibilityChange)
      window.removeEventListener('pagehide', pageHide)
      window.removeEventListener('pageshow', pageShow)
      void endLockdown()
    }
  }, [addLocalEvent, sendEvent])

  useEffect(() => {
    const offline = () => addLocalEvent({ type: 'network_lost' })
    const deviceChange = () => addLocalEvent({ type: 'media_device_changed' })

    window.addEventListener('offline', offline)
    navigator.mediaDevices?.addEventListener?.('devicechange', deviceChange)

    let battery: BatteryManager | null = null
    let batteryCritical: (() => void) | null = null

    const getBattery = (
      navigator as Navigator & { getBattery?: () => Promise<BatteryManager> }
    ).getBattery

    if (getBattery) {
      void getBattery.call(navigator).then((manager) => {
        battery = manager
        batteryCritical = () => {
          if (!manager.charging && manager.level <= 0.1) {
            addLocalEvent({ type: 'battery_critical', details: { level: manager.level } })
          }
        }
        manager.addEventListener('levelchange', batteryCritical)
        manager.addEventListener('chargingchange', batteryCritical)
      })
    }

    return () => {
      window.removeEventListener('offline', offline)
      navigator.mediaDevices?.removeEventListener?.('devicechange', deviceChange)
      if (battery && batteryCritical) {
        battery.removeEventListener('levelchange', batteryCritical)
        battery.removeEventListener('chargingchange', batteryCritical)
      }
    }
  }, [addLocalEvent])

  useEffect(() => {
    if (!attemptId || !profile || submitted || !exam || !lockdownReady) {
      if (!profile) setVideoStatus('Calibration profile missing — complete pre-exam calibration')
      return
    }

    let cancelled = false

    const startVideo = async () => {
      try {
        setVideoStatus('Requesting camera…')
        const stream = await requestCamera()
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (!videoRef.current) {
          throw new Error('Video preview is not ready')
        }
        videoRef.current.srcObject = stream
        setVideoStatus('Camera active')
        await videoRef.current.play()
        await waitForVideoReady(videoRef.current)

        setVideoStatus('Loading vision models…')
        const monitor = new VideoProctorMonitor({
          attemptId,
          profile,
          video: videoRef.current,
          callbacks: {
            onFindings: (findings: VideoProctorFinding[]) => {
              for (const finding of findings) {
                addLocalEvent({
                  type: finding.type,
                  details: {
                    confidence: finding.confidence,
                    ...(finding.details ?? {}),
                  },
                })
                const stickyFace =
                  finding.type === 'no_face' || finding.type === 'multi_face'
                setTransientVideoAlert(
                  finding.type,
                  {
                    confidence: finding.confidence,
                    ...(finding.details ?? {}),
                  },
                  stickyFace,
                )
              }
            },
            onClearFindings: (types) => {
              setLiveVideoAlert((current) =>
                current && types.includes(current.type as VideoProctorFinding['type'])
                  ? null
                  : current,
              )
            },
            onQueueStats: (stats) => setUploadStats(stats),
            onIntegrityEvent: (type, details) => {
              addLocalEvent({ type, details })
              setTransientVideoAlert(type, details ?? {}, true)
            },
            getExamContext: () => {
              const liveExam = examRef.current
              const index = currentIndexRef.current
              const question = liveExam?.questions[index]
              return {
                questionId: question?.id,
                questionIndex: index,
                questionText: question?.text?.slice(0, 180),
              }
            },
          },
        })
        monitorRef.current = monitor
        await monitor.start()

        const tracks = stream.getVideoTracks()
        for (const track of tracks) {
          track.addEventListener('ended', () => {
            addLocalEvent({
              type: 'proctor_webcam_failed',
              details: { reason: 'track_ended' },
            })
            setTransientVideoAlert('proctor_webcam_failed', { reason: 'track_ended' }, true)
            setVideoStatus('Webcam track ended — camera blocked or disconnected')
          })
        }

        setVideoStatus('Live video proctoring active')
      } catch (error) {
        setVideoStatus(error instanceof Error ? error.message : 'Camera unavailable')
        addLocalEvent({
          type: 'media_device_changed',
          details: { reason: 'video_proctor_start_failed' },
        })
      }
    }

    void startVideo()

    return () => {
      cancelled = true
      void monitorRef.current?.stop()
      monitorRef.current = null
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [addLocalEvent, attemptId, exam, lockdownReady, profile, setTransientVideoAlert, submitted])

  useEffect(() => {
    if (!lockdownReady || submitted || remainingSeconds === null || remainingSeconds <= 0) return
    const timer = window.setInterval(() => {
      setRemainingSeconds((value) => (value === null ? null : Math.max(value - 1, 0)))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [lockdownReady, remainingSeconds, submitted])

  useEffect(() => {
    if (exam && remainingSeconds === 0 && !submitted) {
      void submitExam()
    }
  }, [exam, remainingSeconds, submitted, submitExam])

  if (!exam || !currentQuestion) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb] text-sm text-gray-700">
        Loading exam…
      </div>
    )
  }

  if (!lockdownReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#111318] px-6 text-white">
        <div className="w-full max-w-md text-center">
          <img src={logoUrl} alt="upGrad" className="mx-auto h-9" />
          <h1 className="mt-6 text-xl font-bold">
            {lockdownError ? 'Unable to secure exam' : 'Securing exam environment'}
          </h1>
          <p className={`mt-2 text-sm ${lockdownError ? 'text-red-300' : 'text-white/65'}`}>
            {lockdownError ?? 'Entering kiosk mode and locking application switching…'}
          </p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb] px-6">
        <div className="w-full max-w-xl border border-gray-200 bg-white p-6 text-center">
          <img src={logoUrl} alt="upGrad" className="mx-auto h-9" />
          <h1 className="mt-5 text-2xl font-extrabold text-[#df2428]">Exam submitted</h1>
          <p className="mt-2 text-sm text-gray-700">
            Score: {submission?.score ?? 0}/{submission?.totalMarks ?? exam.totalMarks}
          </p>
          <p className="mt-1 text-xs text-gray-500">Proctoring events captured: {events.length}</p>
          <button
            type="button"
            onClick={() => {
              void endLockdown().finally(() => navigate('/home', { replace: true }))
            }}
            className="mt-5 rounded-md bg-[#df2428] px-5 py-3 text-sm font-bold uppercase tracking-wide text-white"
          >
            Back to exams
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen select-none flex-col bg-[#f8f9fb]">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Secure exam</p>
          <h1 className="text-lg font-extrabold text-[#df2428]">{exam.title}</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-700">
            Answered {answeredCount}/{exam.questions.length}
          </span>
          <span className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-[#df2428]">
            {formatTime(remainingSeconds ?? exam.durationSeconds)}
          </span>
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              void submitExam()
            }}
            className="rounded-md bg-[#df2428] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </header>

      {bannerAlert ? (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-[#df2428]">
          Violation detected: {bannerAlert.type.replace(/_/g, ' ')}
          {bannerAlert.details?.appName
            ? ` (${String(bannerAlert.details.appName)})`
            : ''}
        </div>
      ) : null}

      {submitError ? (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700">
          {submitError}
        </div>
      ) : null}

      {submitting ? (
        <div className="absolute inset-0 z-[100] grid place-items-center bg-black/45 px-6 backdrop-blur-[1px]">
          <div className="w-full max-w-sm border border-gray-200 bg-white p-5 text-center shadow-xl">
            <p className="text-base font-bold text-gray-900">Submitting exam</p>
            <p className="mt-2 text-sm text-gray-600">Please wait. Do not close the application.</p>
          </div>
        </div>
      ) : null}

      <main className="grid min-h-0 flex-1 grid-cols-[260px_1fr_300px]">
        <aside className="min-h-0 overflow-y-auto border-r border-gray-200 bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Questions
          </p>
          <div className="grid grid-cols-5 gap-2">
            {exam.questions.map((question, index) => {
              const active = index === currentIndex
              const answered = answers[question.id] !== undefined
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={`h-9 rounded-md border text-xs font-semibold ${
                    active
                      ? 'border-[#df2428] bg-red-50 text-[#df2428]'
                      : answered
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  {index + 1}
                </button>
              )
            })}
          </div>
        </aside>

        <section className="min-h-0 overflow-y-auto p-6">
          <div className="border border-gray-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Question {currentIndex + 1} of {exam.questions.length}
            </p>
            <h2 className="mt-3 text-xl font-bold leading-relaxed text-gray-900">
              {currentQuestion.text}
            </h2>
            <div className="mt-6 space-y-3">
              {currentQuestion.options.map((option, optionIndex) => {
                const selected = answers[currentQuestion.id] === optionIndex
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setAnswers((items) => ({ ...items, [currentQuestion.id]: optionIndex }))
                      if (attemptId) void saveExamAnswer(attemptId, currentQuestion.id, optionIndex)
                    }}
                    className={`flex w-full items-center gap-3 border px-4 py-3 text-left text-sm ${
                      selected
                        ? 'border-[#df2428] bg-red-50 text-[#df2428]'
                        : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs font-bold">
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    {option}
                  </button>
                )
              })}
            </div>
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentIndex === exam.questions.length - 1}
                onClick={() =>
                  setCurrentIndex((index) => Math.min(index + 1, exam.questions.length - 1))
                }
                className="rounded-md bg-[#df2428] px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <aside className="min-h-0 overflow-y-auto border-l border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Video proctoring
              </p>
              <p className="mt-1 text-[11px] text-gray-600">{videoStatus}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                videoStatus.includes('active')
                  ? 'bg-green-50 text-green-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {videoStatus.includes('active') ? 'Live' : 'Starting'}
            </span>
          </div>
          <div className="mt-3 overflow-hidden border border-gray-200 bg-black shadow-sm">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="aspect-video w-full object-cover"
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
            Proctoring captures webcam frames and full exam screenshots (question + video) for
            review.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="border border-gray-200 bg-gray-50 p-2">
              <p className="font-bold text-gray-900">{uploadStats.uploaded}</p>
              <p className="text-gray-500">saved</p>
            </div>
            <div className="border border-gray-200 bg-gray-50 p-2">
              <p className="font-bold text-gray-900">{uploadStats.queued + uploadStats.inflight}</p>
              <p className="text-gray-500">pending</p>
            </div>
            <div className="border border-gray-200 bg-gray-50 p-2">
              <p className="font-bold text-gray-900">{uploadStats.failed + uploadStats.dropped}</p>
              <p className="text-gray-500">missed</p>
            </div>
          </div>

          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Event feed
          </p>
          <div className="space-y-2">
            {events.length === 0 ? (
              <p className="border border-green-200 bg-green-50 p-3 text-xs text-green-700">
                No suspicious events detected.
              </p>
            ) : (
              events.map((event) => (
                <div
                  key={`${event.type}-${event.occurredAt}`}
                  className="border border-amber-200 bg-amber-50 p-3"
                >
                  <p className="text-xs font-semibold text-amber-800">
                    {event.type.replace(/_/g, ' ')}
                  </p>
                  <p className="mt-1 text-[11px] text-amber-700">
                    {new Date(event.occurredAt).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </aside>
      </main>
    </div>
  )
}
