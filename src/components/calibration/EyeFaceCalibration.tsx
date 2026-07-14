import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildCalibrationProfile,
  buildGazeCapture,
  buildHeadPoseCapture,
  collectBurstSamples,
  countCalibrationProgress,
} from '@/lib/video-proctoring/calibration'
import { getFaceLandmarker } from '@/lib/vision/face-landmarker'
import { mapCoverFaceBox, STATIC_FACE_GUIDE } from '@/lib/vision/face-overlay'
import {
  HEAD_POSE_STEPS,
  GAZE_DOT_SIZE_PX,
  MIN_GAZE_CALIBRATION_SIZE,
  buildEdgeNinePointGrid,
  isViewportReadyForGazeCalibration,
  type CalibrationCapture,
  type CalibrationProfile,
  type CalibrationPointId,
  type FaceBoundingBox,
  type HeadPoseLabel,
} from '@/lib/vision/types'

type Phase = 'boot' | 'head' | 'gaze' | 'done'

type EyeFaceCalibrationProps = {
  onComplete: (profile: CalibrationProfile) => void
  onError?: (message: string) => void
  calibrationReady?: boolean
  starting?: boolean
  onStartTest?: () => void
  onRecalibrate?: () => void
}

export default function EyeFaceCalibration({
  onComplete,
  onError,
  calibrationReady = false,
  starting = false,
  onStartTest,
  onRecalibrate,
}: EyeFaceCalibrationProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const capturesRef = useRef<CalibrationCapture[]>([])
  const busyRef = useRef(false)
  const completedRef = useRef(false)
  const [phase, setPhase] = useState<Phase>('boot')
  const [headIndex, setHeadIndex] = useState(0)
  const [gazeIndex, setGazeIndex] = useState(0)
  const [captures, setCaptures] = useState<CalibrationCapture[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('Preparing camera…')
  const [faceLocked, setFaceLocked] = useState(false)
  const [faceBox, setFaceBox] = useState<FaceBoundingBox | null>(null)
  const [overlayBox, setOverlayBox] = useState<{
    left: number
    top: number
    width: number
    height: number
  } | null>(null)
  const [viewportOk, setViewportOk] = useState(() => isViewportReadyForGazeCalibration())
  const [gazeGrid, setGazeGrid] = useState(() => buildEdgeNinePointGrid())

  const currentHead = HEAD_POSE_STEPS[headIndex]
  const currentGaze = gazeGrid[gazeIndex]
  const progressStats = useMemo(() => countCalibrationProgress(captures), [captures])
  const showComplete = calibrationReady || phase === 'done'

  const upsertCapture = (capture: CalibrationCapture) => {
    const next = [
      ...capturesRef.current.filter(
        (item) => !(item.kind === capture.kind && item.label === capture.label),
      ),
      capture,
    ]
    capturesRef.current = next
    setCaptures(next)
    return next
  }

  const hasLabel = (kind: CalibrationCapture['kind'], label: string) =>
    capturesRef.current.some((item) => item.kind === kind && item.label === label)

  useEffect(() => {
    const syncViewport = () => {
      setViewportOk(isViewportReadyForGazeCalibration())
      setGazeGrid(buildEdgeNinePointGrid())
    }
    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  useEffect(() => {
    const remap = () => {
      if (!faceBox || !videoRef.current || !stageRef.current) {
        setOverlayBox(null)
        return
      }
      setOverlayBox(mapCoverFaceBox(faceBox, videoRef.current, stageRef.current))
    }
    remap()
    window.addEventListener('resize', remap)
    return () => window.removeEventListener('resize', remap)
  }, [faceBox])

  useEffect(() => {
    if (showComplete) return
    let cancelled = false
    let faceTimer: number | null = null
    let missStreak = 0

    const boot = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        setProgress('Loading face model…')
        await getFaceLandmarker()
        if (cancelled) return

        setProgress('Ready')
        setPhase('head')

        const { detectFaces } = await import('@/lib/vision/face-landmarker')
        const landmarker = await getFaceLandmarker()
        faceTimer = window.setInterval(() => {
          if (!videoRef.current || videoRef.current.readyState < 2) return
          const result = detectFaces(landmarker, videoRef.current)
          if (result.faceCount < 0) return
          if (result.faceCount === 1 && result.samples[0]) {
            missStreak = 0
            setFaceLocked(true)
            setFaceBox(result.samples[0].boundingBox)
          } else if (result.faceCount === 0) {
            missStreak += 1
            if (missStreak >= 4) {
              setFaceLocked(false)
              setFaceBox(null)
            }
          } else {
            missStreak = 0
            setFaceLocked(false)
            setFaceBox(result.samples[0]?.boundingBox ?? null)
          }
        }, 200)
      } catch (error) {
        onError?.(error instanceof Error ? error.message : 'Unable to start calibration camera')
      }
    }

    void boot()

    return () => {
      cancelled = true
      if (faceTimer) window.clearInterval(faceTimer)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [onError, showComplete])

  const finishIfReady = (nextCaptures: CalibrationCapture[]) => {
    const stats = countCalibrationProgress(nextCaptures)
    if (!stats.isComplete || completedRef.current) return false

    try {
      const profile = buildCalibrationProfile(nextCaptures)
      completedRef.current = true
      setPhase('done')
      setProgress('Profile saved')
      onComplete(profile)
      return true
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Calibration finalize failed')
      return false
    }
  }

  const runCapture = async () => {
    if (!videoRef.current || busyRef.current || !faceLocked || completedRef.current) return
    if (phase !== 'head' && phase !== 'gaze') return
    if (phase === 'gaze' && !viewportOk) {
      onError?.(
        `Window too small for eye calibration. Expand to at least ${MIN_GAZE_CALIBRATION_SIZE.width}×${MIN_GAZE_CALIBRATION_SIZE.height}.`,
      )
      return
    }

    if (phase === 'head' && currentHead && hasLabel('head_pose', currentHead.label)) {
      if (headIndex + 1 < HEAD_POSE_STEPS.length) setHeadIndex((v) => v + 1)
      else setPhase('gaze')
      return
    }

    if (phase === 'gaze' && currentGaze && hasLabel('gaze_point', currentGaze.id)) {
      if (gazeIndex + 1 < gazeGrid.length) setGazeIndex((v) => v + 1)
      else finishIfReady(capturesRef.current)
      return
    }

    busyRef.current = true
    setBusy(true)
    setProgress('Capturing…')

    try {
      const clickedAt = new Date().toISOString()
      const samples = await collectBurstSamples(videoRef.current, 24)

      if (phase === 'head' && currentHead) {
        const capture = buildHeadPoseCapture(
          currentHead.label as HeadPoseLabel,
          samples,
          clickedAt,
        )
        const nextCaptures = upsertCapture(capture)

        if (headIndex + 1 < HEAD_POSE_STEPS.length) {
          setHeadIndex((v) => v + 1)
          setProgress(`Pose ${headIndex + 1}/5 saved`)
        } else {
          setPhase('gaze')
          setProgress('Click the 9 edge targets')
        }
        finishIfReady(nextCaptures)
      } else if (phase === 'gaze' && currentGaze) {
        const capture = buildGazeCapture(
          currentGaze.id as CalibrationPointId,
          samples,
          clickedAt,
          currentGaze.nx * window.innerWidth,
          currentGaze.ny * window.innerHeight,
          currentGaze.nx,
          currentGaze.ny,
        )
        const nextCaptures = upsertCapture(capture)

        if (gazeIndex + 1 < gazeGrid.length) {
          setGazeIndex((v) => v + 1)
          setProgress(`Gaze ${gazeIndex + 1}/9 saved`)
        } else {
          finishIfReady(nextCaptures)
        }
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Calibration capture failed')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const title =
    phase === 'boot'
      ? 'Starting face tracking…'
      : phase === 'head' && currentHead
        ? currentHead.title
        : phase === 'gaze'
          ? `Gaze target ${Math.min(gazeIndex + 1, 9)} of 9`
          : 'Calibration complete'

  const subtitle =
    phase === 'head' && currentHead
      ? currentHead.instruction
      : phase === 'gaze' && !viewportOk
        ? `Expand window to ${MIN_GAZE_CALIBRATION_SIZE.width}×${MIN_GAZE_CALIBRATION_SIZE.height} for accurate edge targeting.`
        : phase === 'gaze'
          ? 'Look at the red edge target, then click it.'
          : phase === 'boot'
            ? 'Keep your face centered and well lit.'
            : 'Profile is ready for continuous proctoring.'

  return (
    <div className="flex min-h-[calc(100vh-11rem)] flex-1 flex-col overflow-hidden border border-gray-200 bg-white">
      <div className="flex items-center gap-4 border-b border-gray-200 bg-white px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-[#df2428]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#df2428]">
              Calibration
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              {phase === 'head'
                ? 'Head pose'
                : phase === 'gaze'
                  ? 'Gaze map'
                  : phase === 'done'
                    ? 'Done'
                    : 'Setup'}
            </span>
          </div>
          <h2 className="mt-1 truncate text-base font-bold text-gray-900 sm:text-lg">{title}</h2>
          <p className="mt-0.5 truncate text-xs text-gray-500 sm:text-sm">{subtitle}</p>
        </div>

        <div className="hidden shrink-0 items-center gap-4 sm:flex">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Poses</p>
            <p className="text-sm font-bold tabular-nums text-gray-900">
              {progressStats.headDone}
              <span className="text-gray-400">/5</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Gaze</p>
            <p className="text-sm font-bold tabular-nums text-gray-900">
              {progressStats.gazeDone}
              <span className="text-gray-400">/9</span>
            </p>
          </div>
          <div className="w-28">
            <div className="flex items-center justify-between text-[10px] font-semibold text-gray-500">
              <span>Progress</span>
              <span>{progressStats.percent}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[#df2428] transition-all duration-500"
                style={{ width: `${progressStats.percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div ref={stageRef} className="relative min-h-[300px] bg-gray-100 lg:min-h-0">
          {!showComplete ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />

              <div className="pointer-events-none absolute inset-0">
                {overlayBox ? (
                  <div
                    className="absolute rounded-[46%] border-[2.5px] border-emerald-500 transition-[left,top,width,height] duration-75"
                    style={{
                      left: overlayBox.left,
                      top: overlayBox.top,
                      width: overlayBox.width,
                      height: overlayBox.height,
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="rounded-[48%] border-2 border-dashed border-white/80"
                      style={{
                        width: `${STATIC_FACE_GUIDE.widthPct}%`,
                        height: `${STATIC_FACE_GUIDE.heightPct}%`,
                        maxWidth: 340,
                        maxHeight: 440,
                        transform: 'translateY(-4%)',
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="absolute left-3 top-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded border bg-white/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                    faceLocked
                      ? 'border-green-200 text-green-700'
                      : 'border-amber-200 text-amber-700'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${faceLocked ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`}
                  />
                  {faceLocked ? 'Face locked' : 'Center face'}
                </span>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#f8f9fb] px-6">
              <div className="w-full max-w-md border border-gray-200 bg-white p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl font-black text-green-700 ring-1 ring-green-200">
                  ✓
                </div>
                <h3 className="mt-4 text-xl font-bold text-gray-900">Calibration complete</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Eye, face, gaze and head-pose profile is ready. A final app scan runs when you
                  start.
                </p>
                {onRecalibrate ? (
                  <button
                    type="button"
                    onClick={onRecalibrate}
                    className="mt-5 rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    Recalibrate
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <aside className="flex flex-col border-t border-gray-200 bg-[#f8f9fb] lg:border-l lg:border-t-0">
          <div className="flex-1 space-y-4 p-4">
            <div className="grid grid-cols-2 gap-2 sm:hidden">
              <div className="rounded border border-gray-200 bg-white px-3 py-2">
                <p className="text-[10px] text-gray-400">Poses</p>
                <p className="text-lg font-bold text-gray-900">
                  {progressStats.headDone}
                  <span className="text-sm text-gray-400">/5</span>
                </p>
              </div>
              <div className="rounded border border-gray-200 bg-white px-3 py-2">
                <p className="text-[10px] text-gray-400">Gaze</p>
                <p className="text-lg font-bold text-gray-900">
                  {progressStats.gazeDone}
                  <span className="text-sm text-gray-400">/9</span>
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                Checklist
              </p>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-gray-600">
                <li className={progressStats.headDone >= 5 ? 'font-semibold text-green-700' : undefined}>
                  {progressStats.headDone >= 5 ? '✓' : '○'} 5 head poses
                </li>
                <li className={progressStats.gazeDone >= 9 ? 'font-semibold text-green-700' : undefined}>
                  {progressStats.gazeDone >= 9 ? '✓' : '○'} 9 edge gaze targets
                </li>
                <li>○ One face, well lit</li>
              </ul>
            </div>

            {!showComplete && phase === 'head' ? (
              <div className="rounded border border-gray-200 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  Step {headIndex + 1} / 5
                </p>
                <p className="mt-1 text-base font-bold text-gray-900">{currentHead?.title}</p>
              </div>
            ) : null}

            {!showComplete && phase === 'gaze' ? (
              <div className="rounded border border-gray-200 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  Edge target {Math.min(gazeIndex + 1, 9)} / 9
                </p>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  Click the glowing red dot on the screen edge while looking at it.
                </p>
                {!viewportOk ? (
                  <p className="mt-2 text-xs text-amber-700">
                    Enlarge the window to unlock gaze targets.
                  </p>
                ) : null}
              </div>
            ) : null}

            <p className="text-[11px] text-gray-400">{progress}</p>
          </div>

          <div className="border-t border-gray-200 bg-white p-4">
            {!showComplete && phase === 'head' ? (
              <button
                type="button"
                disabled={busy || !faceLocked}
                onClick={() => void runCapture()}
                className="w-full rounded bg-[#df2428] px-4 py-3 text-sm font-bold uppercase tracking-wide text-white enabled:hover:bg-[#c51f23] disabled:opacity-40"
              >
                {busy ? 'Capturing…' : 'Hold pose & capture'}
              </button>
            ) : null}

            {!showComplete && phase === 'gaze' ? (
              <p className="text-center text-xs text-gray-500">
                Use the on-screen edge targets to continue
              </p>
            ) : null}

            {showComplete ? (
              <button
                type="button"
                disabled={!calibrationReady || starting || !onStartTest}
                onClick={() => onStartTest?.()}
                className="w-full rounded bg-[#df2428] px-4 py-3 text-sm font-bold uppercase tracking-wide text-white enabled:hover:bg-[#c51f23] disabled:opacity-40"
              >
                {starting ? 'Starting…' : 'Start locked test'}
              </button>
            ) : (
              <div
                className={`mt-3 rounded border px-3 py-2 text-xs font-semibold ${
                  faceLocked
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                {faceLocked
                  ? 'Face locked — ready to capture'
                  : 'Finish calibration to unlock the exam'}
              </div>
            )}
          </div>
        </aside>
      </div>

      {phase === 'gaze' && currentGaze && viewportOk && !showComplete ? (
        <button
          type="button"
          disabled={busy || !faceLocked}
          onClick={() => void runCapture()}
          className="fixed z-[9999] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-[#df2428] shadow-[0_0_0_6px_rgba(223,36,40,0.28)] transition enabled:hover:scale-110 disabled:opacity-40"
          style={{
            left: `${currentGaze.nx * 100}vw`,
            top: `${currentGaze.ny * 100}vh`,
            width: GAZE_DOT_SIZE_PX,
            height: GAZE_DOT_SIZE_PX,
          }}
          aria-label={`Calibration point ${gazeIndex + 1}`}
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-[#df2428]/35" />
          <span className="relative text-[11px] font-black text-white">{gazeIndex + 1}</span>
        </button>
      ) : null}
    </div>
  )
}
