import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import EyeFaceCalibration from '@/components/calibration/EyeFaceCalibration'
import MediaConfirmation from '@/components/media/MediaConfirmation'
import CheckAttentionPanel from '@/components/system-checks/CheckAttentionPanel'
import CheckResultsGrid from '@/components/system-checks/CheckResultsGrid'
import CheckSummaryBar from '@/components/system-checks/CheckSummaryBar'
import { getExam, logPreExamEvent, startExamAttempt } from '@/lib/exams/api'
import type { Exam } from '@/lib/exams/types'
import { closeRunningApps, listRunningApps } from '@/lib/proctoring/api'
import type { RunningApp } from '@/lib/proctoring/types'
import { runMediaChecks, runSystemChecks, submitSystemCheckAudit } from '@/lib/system-checks/api'
import { getAttentionItems } from '@/lib/system-checks/messages'
import type { SystemCheckReport } from '@/lib/system-checks/types'
import type { CalibrationProfile } from '@/lib/vision/types'
import { useCalibrationStore } from '@/store/calibrationStore'

type Step = 'checks' | 'apps' | 'media' | 'calibration'

const PRE_EXAM_STEPS: { id: Step; label: string }[] = [
  { id: 'checks', label: 'System' },
  { id: 'apps', label: 'Apps' },
  { id: 'media', label: 'Camera & mic' },
  { id: 'calibration', label: 'Calibration' },
]

function RunningAppIcon({ app }: { app: RunningApp }) {
  if (app.iconDataUrl) {
    return (
      <img
        src={app.iconDataUrl}
        alt={app.displayName}
        className="h-8 w-8 rounded-md border border-gray-200 bg-white object-contain"
      />
    )
  }

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-gray-100 text-xs font-semibold text-gray-500">
      ?
    </div>
  )
}

function stepCopy(step: Step) {
  if (step === 'checks') return 'System checks are running before the exam starts.'
  if (step === 'apps') return 'Close every other app before starting the test.'
  if (step === 'media') return 'Confirm camera and microphone quality before calibration.'
  return 'Complete eye and face calibration before the locked exam opens.'
}

export default function PreExamPage() {
  const { examId } = useParams()
  const navigate = useNavigate()
  const setProfile = useCalibrationStore((state) => state.setProfile)
  const clearProfile = useCalibrationStore((state) => state.clearProfile)
  const [exam, setExam] = useState<Exam | null>(null)
  const [step, setStep] = useState<Step>('checks')
  const [report, setReport] = useState<SystemCheckReport | null>(null)
  const [runningApps, setRunningApps] = useState<RunningApp[]>([])
  const [mediaReady, setMediaReady] = useState(false)
  const [calibrationReady, setCalibrationReady] = useState(false)
  const [calibrationKey, setCalibrationKey] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [loadingChecks, setLoadingChecks] = useState(true)
  const [loadingApps, setLoadingApps] = useState(false)
  const [closingApps, setClosingApps] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)

  const attentionItems = useMemo(() => getAttentionItems(report?.checks ?? []), [report])
  const closableApps = runningApps.filter((app) => !app.allowed)

  useEffect(() => {
    if (!examId) return
    let cancelled = false
    getExam(examId)
      .then((item) => {
        if (!cancelled) setExam(item)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load exam')
      })
    return () => {
      cancelled = true
    }
  }, [examId])

  const runChecks = useCallback(async () => {
    setLoadingChecks(true)
    setError(null)
    try {
      if (examId) void logPreExamEvent(examId, { type: 'system_checks_started' })
      const media = await runMediaChecks()
      const nextReport = await runSystemChecks(media)
      setReport(nextReport)
      void submitSystemCheckAudit(nextReport)
      if (examId) {
        void logPreExamEvent(examId, {
          type: 'system_checks_completed',
          details: {
            passed: nextReport.passed,
            failed: nextReport.summary.failed,
            warnings: nextReport.summary.warnings,
            runId: nextReport.runId,
          },
        })
      }
    } catch (err) {
      if (examId) {
        void logPreExamEvent(examId, {
          type: 'system_checks_failed',
          details: { message: err instanceof Error ? err.message : 'Unknown error' },
        })
      }
      setError(err instanceof Error ? err.message : 'Unable to run system checks')
    } finally {
      setLoadingChecks(false)
    }
  }, [examId])

  const loadApps = async () => {
    setLoadingApps(true)
    setError(null)
    try {
      const apps = await listRunningApps()
      setRunningApps(apps)
      if (examId) {
        void logPreExamEvent(examId, {
          type: 'running_apps_scanned',
          details: {
            total: apps.length,
            closable: apps.filter((app) => !app.allowed).length,
            apps: apps.map((app) => ({
              pid: app.pid,
              displayName: app.displayName,
              processName: app.processName,
              allowed: Boolean(app.allowed),
            })),
          },
        })
      }
      setStep('apps')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to read running apps')
    } finally {
      setLoadingApps(false)
    }
  }

  const closeApps = async () => {
    setClosingApps(true)
    setError(null)
    try {
      if (examId) {
        void logPreExamEvent(examId, {
          type: 'close_apps_requested',
          details: { pids: closableApps.map((app) => app.pid), count: closableApps.length },
        })
      }
      const result = await closeRunningApps(closableApps.map((app) => app.pid))
      if (examId) {
        void logPreExamEvent(examId, {
          type: 'close_apps_completed',
          details: result,
        })
      }
      window.setTimeout(() => {
        void loadApps()
      }, 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to close apps')
    } finally {
      setClosingApps(false)
    }
  }

  const startMediaPreview = useCallback(async () => {
    setError(null)
    setMediaReady(false)
    try {
      if (examId) void logPreExamEvent(examId, { type: 'media_preview_started' })
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      mediaStreamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream

      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      const data = new Uint8Array(analyser.frequencyBinCount)
      source.connect(analyser)

      const tick = () => {
        analyser.getByteFrequencyData(data)
        const average = data.reduce((total, value) => total + value, 0) / data.length
        setAudioLevel(Math.min(100, Math.round((average / 128) * 100)))
        animationRef.current = window.requestAnimationFrame(tick)
      }

      tick()
      setMediaReady(true)
      if (examId) {
        void logPreExamEvent(examId, {
          type: 'media_preview_ready',
          details: {
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length,
          },
        })
      }
    } catch (err) {
      if (examId) {
        void logPreExamEvent(examId, {
          type: 'media_preview_failed',
          details: { message: err instanceof Error ? err.message : 'Unknown error' },
        })
      }
      setError(err instanceof Error ? err.message : 'Camera and microphone are required')
    }
  }, [examId])

  const stopMediaPreview = useCallback(() => {
    if (animationRef.current) window.cancelAnimationFrame(animationRef.current)
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
  }, [])

  const handleCalibrationComplete = (profile: CalibrationProfile) => {
    setError(null)
    setProfile(profile)
    setCalibrationReady(true)
    if (examId) {
      void logPreExamEvent(examId, {
        type: 'calibration_completed',
        details: {
          createdAt: profile.createdAt,
          gazePoints: Object.keys(profile.gazeMap).length,
          headPoses: Object.keys(profile.headPoseBaselines).length,
        },
      })
    }
  }

  const startTest = async () => {
    if (!exam || !calibrationReady) return
    setStarting(true)
    setError(null)
    try {
      const apps = await listRunningApps()
      const newlyOpenedApps = apps.filter((app) => !app.allowed)
      if (newlyOpenedApps.length > 0) {
        setRunningApps(apps)
        setStep('apps')
        setError('New applications were opened after calibration. Close them before starting the exam.')
        void logPreExamEvent(exam.id, {
          type: 'final_apps_scan_failed',
          details: {
            closable: newlyOpenedApps.length,
            apps: newlyOpenedApps.map((app) => ({
              pid: app.pid,
              displayName: app.displayName,
              processName: app.processName,
            })),
          },
        })
        return
      }

      void logPreExamEvent(exam.id, { type: 'attempt_start_requested' })
      const attempt = await startExamAttempt(exam.id)
      const profile = useCalibrationStore.getState().profile
      if (profile) void useCalibrationStore.getState().persistRemote(attempt.id)
      navigate(`/exams/${exam.id}/take?attemptId=${attempt.id}`, {
        replace: true,
        state: { attemptId: attempt.id },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start exam')
    } finally {
      setStarting(false)
    }
  }

  useEffect(() => {
    void runChecks()
  }, [runChecks])

  useEffect(() => {
    if (step === 'media') {
      void startMediaPreview()
      return () => stopMediaPreview()
    }
    stopMediaPreview()
    return undefined
  }, [startMediaPreview, step, stopMediaPreview])

  if (!exam) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb]">
        <div className="border border-gray-200 bg-white p-6 text-center">
          <p className="text-sm font-semibold text-gray-900">Exam not found</p>
          <Link to="/home" className="mt-3 inline-flex text-sm font-semibold text-[#df2428]">
            Back to exams
          </Link>
        </div>
      </div>
    )
  }

  const goToCalibration = () => {
    clearProfile()
    setCalibrationReady(false)
    setCalibrationKey((value) => value + 1)
    setError(null)
    setStep('calibration')
    if (examId) void logPreExamEvent(examId, { type: 'calibration_started' })
  }

  const stepIndex = PRE_EXAM_STEPS.findIndex((item) => item.id === step)
  const immersiveLayout = step === 'media' || step === 'calibration'

  const contentMax = immersiveLayout ? 'max-w-[1400px]' : 'max-w-6xl'

  return (
    <div className="flex min-h-screen flex-col bg-[#f3f4f7]">
      <header
        className={`border-b border-gray-200/80 bg-white ${
          immersiveLayout ? 'px-4 py-2.5 sm:px-6' : 'px-5 py-4 sm:px-8 lg:px-10'
        }`}
      >
        <div className={`mx-auto w-full ${contentMax}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {immersiveLayout ? (
                <div className="flex items-center gap-3">
                  <img src="/assets/upgradsot_logo_small.png" alt="upGrad" className="h-6" />
                  <div className="min-w-0">
                    <h1 className="truncate text-sm font-bold text-[#df2428] sm:text-base">
                      {exam.title}
                    </h1>
                    <p className="truncate text-xs text-gray-500">{stepCopy(step)}</p>
                  </div>
                </div>
              ) : (
                <>
                  <img
                    src="/assets/upgradsot_logo_small.png"
                    alt="upGrad"
                    className="h-7 sm:h-8"
                  />
                  <h1 className="mt-3 truncate text-2xl font-extrabold tracking-tight text-[#df2428] sm:text-[1.75rem]">
                    {exam.title}
                  </h1>
                  <p className="mt-1.5 text-sm text-gray-600">{stepCopy(step)}</p>
                </>
              )}
            </div>
            <Link
              to="/home"
              className="shrink-0 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 sm:px-4"
            >
              Back
            </Link>
          </div>

          <div
            className={`flex w-full gap-2 overflow-x-auto ${
              immersiveLayout ? 'mt-2.5' : 'mt-5'
            }`}
          >
            {PRE_EXAM_STEPS.map((item, index) => {
              const reached = index <= stepIndex
              const active = item.id === step
              return (
                <div
                  key={item.id}
                  className={`flex min-w-[7rem] flex-1 items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
                    active
                      ? 'border-[#df2428]/25 bg-[#df2428]/5 shadow-sm'
                      : reached
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-[#fafbfc]'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      active
                        ? 'bg-[#df2428] text-white'
                        : reached
                          ? 'bg-green-600 text-white'
                          : 'bg-white text-gray-500 ring-1 ring-gray-200'
                    }`}
                  >
                    {reached && !active ? '✓' : index + 1}
                  </span>
                  <span
                    className={`truncate text-xs font-semibold ${
                      active ? 'text-[#df2428]' : reached ? 'text-green-800' : 'text-gray-500'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </header>

      <main
        className={`mx-auto grid w-full flex-1 ${contentMax} ${
          immersiveLayout
            ? 'px-4 py-3 sm:px-6'
            : 'items-start gap-5 px-5 py-5 sm:gap-6 sm:px-8 sm:py-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.72fr)] lg:px-10'
        }`}
      >
        <section className={`min-w-0 ${immersiveLayout ? 'flex min-h-[calc(100vh-11rem)] flex-col' : ''}`}>
          {error && immersiveLayout ? (
            <div className="mb-2 shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {step === 'checks' ? (
            <div className="space-y-4">
              {report ? (
                <>
                  <CheckSummaryBar
                    checks={report.checks}
                    isRunning={loadingChecks}
                    hasPassed={report.passed}
                  />
                  <CheckResultsGrid checks={report.checks} isRunning={loadingChecks} />
                </>
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700 shadow-sm">
                  Running system checks…
                </div>
              )}
            </div>
          ) : null}

          {step === 'apps' ? (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                  Running applications
                </p>
                <h2 className="mt-1.5 text-xl font-bold tracking-tight text-gray-900">
                  Close all apps except this exam app
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                  Cursor is allowed for local testing. Every other visible app must be closed before
                  Next is enabled.
                </p>
              </div>
              <div className="grid max-h-[520px] overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
                {runningApps.map((app) => (
                  <div
                    key={`${app.path ?? app.processName}-${app.pid}`}
                    className="flex items-center gap-3 border-b border-gray-50 px-5 py-4 sm:border-r"
                  >
                    <RunningAppIcon app={app} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-tight text-gray-900">
                        {app.displayName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">{app.processName}</p>
                      {app.allowed ? (
                        <p className="mt-1 text-[11px] font-semibold text-green-700">
                          {app.allowReason}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {step === 'media' ? (
            <MediaConfirmation
              ref={videoRef}
              mediaReady={mediaReady}
              audioLevel={audioLevel}
              onContinue={goToCalibration}
            />
          ) : null}

          {step === 'calibration' ? (
            <EyeFaceCalibration
              key={calibrationKey}
              calibrationReady={calibrationReady}
              starting={starting}
              onStartTest={() => void startTest()}
              onRecalibrate={() => {
                clearProfile()
                setCalibrationReady(false)
                setError(null)
                setCalibrationKey((value) => value + 1)
              }}
              onComplete={handleCalibrationComplete}
              onError={(message) => {
                setCalibrationReady(false)
                setError(message)
              }}
            />
          ) : null}
        </section>

        {!immersiveLayout ? (
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-5">
            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {step === 'checks' ? (
              <>
                <CheckAttentionPanel
                  items={attentionItems}
                  onResolved={() => void runChecks()}
                />
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold text-gray-900">Next step</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
                    Fix issues above, then continue once required checks pass.
                  </p>
                  <div className="mt-4 flex gap-2.5">
                    <button
                      type="button"
                      disabled={loadingChecks}
                      onClick={() => void runChecks()}
                      className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:opacity-50"
                    >
                      Re-run
                    </button>
                    <button
                      type="button"
                      disabled={!report?.passed || loadingApps}
                      onClick={() => void loadApps()}
                      className="flex-1 rounded-xl bg-[#df2428] px-3 py-2.5 text-sm font-bold text-white transition hover:bg-[#c51f23] disabled:opacity-50"
                    >
                      {loadingApps ? 'Loading…' : 'Next'}
                    </button>
                  </div>
                </div>
              </>
            ) : null}

            {step === 'apps' ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-gray-900">Before starting</p>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-gray-600">
                  <li>Close all detected apps using the button below.</li>
                  <li>Cursor is allowed only for local testing.</li>
                  <li>Next unlocks only when no closable apps remain.</li>
                </ul>
                <button
                  type="button"
                  disabled={closableApps.length === 0 || closingApps}
                  onClick={() => void closeApps()}
                  className="mt-4 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-800 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  {closingApps
                    ? 'Closing apps…'
                    : `Close ${closableApps.length} app${closableApps.length === 1 ? '' : 's'}`}
                </button>
                <button
                  type="button"
                  disabled={closableApps.length > 0}
                  onClick={() => setStep('media')}
                  className="mt-2.5 w-full rounded-xl bg-[#df2428] px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#c51f23] disabled:opacity-50"
                >
                  Next: camera and audio
                </button>
              </div>
            ) : null}
          </aside>
        ) : null}
      </main>
    </div>
  )
}
