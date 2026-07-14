import { base64JpegToBlob, captureVideoFrame } from '@/lib/vision/frame-capture'
import { detectFaces, getFaceLandmarker } from '@/lib/vision/face-landmarker'
import { headPoseDelta } from '@/lib/vision/geometry'
import { detectProhibitedObjects, getObjectDetector } from '@/lib/vision/object-detector'
import { captureExamScreen } from '@/lib/proctoring/api'
import type {
  CalibrationPointId,
  CalibrationProfile,
  FaceSample,
  HeadPose,
  Point2D,
  VideoProctorFinding,
  VideoViolationType,
} from '@/lib/vision/types'
import { FrameUploadQueue } from './upload-queue'

type ExamCaptureContext = {
  questionId?: string
  questionIndex?: number
  questionText?: string
}

type MonitorCallbacks = {
  onFindings: (findings: VideoProctorFinding[], sample: FaceSample | null) => void
 
  onClearFindings?: (types: VideoViolationType[]) => void

  onIntegrityEvent?: (type: 'proctor_webcam_failed' | 'proctor_screenshot_failed', details?: Record<string, unknown>) => void
  onQueueStats?: (stats: ReturnType<FrameUploadQueue['getStats']>) => void
  getExamContext?: () => ExamCaptureContext
}

type MonitorOptions = {
  attemptId: string
  profile: CalibrationProfile
  video: HTMLVideoElement
  callbacks: MonitorCallbacks
}

const SAMPLE_INTERVAL_MS = 12_000
const SCREENSHOT_INTERVAL_MS = 20_000
const OBJECT_INTERVAL_MS = 1_400
const FACE_INTERVAL_MS = 220
const VIOLATION_COOLDOWN_MS = 4_000
const NO_FACE_STREAK_REQUIRED = 7
const MULTI_FACE_STREAK_REQUIRED = 4
const GAZE_ENVELOPE_PAD = 0.045
const HEAD_YAW_HARD_LIMIT = 28
const HEAD_PITCH_HARD_LIMIT = 24

export class VideoProctorMonitor {
  private readonly attemptId: string
  private readonly profile: CalibrationProfile
  private readonly video: HTMLVideoElement
  private readonly callbacks: MonitorCallbacks
  private readonly queue = new FrameUploadQueue()
  private running = false
  private faceTimer: number | null = null
  private objectTimer: number | null = null
  private sampleTimer: number | null = null
  private screenshotTimer: number | null = null
  private lastViolationAt = new Map<VideoViolationType, number>()
  private faceReady = false
  private objectReady = false
  private noFaceStreak = 0
  private multiFaceStreak = 0
  private phoneStreak = 0
  private bookStreak = 0
  private webcamFailStreak = 0
  private screenshotFailStreak = 0
  private activeNoFace = false
  private activeMultiFace = false
  private notifiedWebcamFail = false
  private notifiedScreenshotFail = false
  private readonly gazeEnvelope: { minX: number; maxX: number; minY: number; maxY: number }
  private readonly headEnvelope: {
    yawMin: number
    yawMax: number
    pitchMin: number
    pitchMax: number
    straight: HeadPose
  }

  constructor(options: MonitorOptions) {
    this.attemptId = options.attemptId
    this.profile = options.profile
    this.video = options.video
    this.callbacks = options.callbacks
    this.gazeEnvelope = buildGazeEnvelope(options.profile)
    this.headEnvelope = buildHeadEnvelope(options.profile)
  }

  async start() {
    if (this.running) return
    this.running = true

    await Promise.all([getFaceLandmarker(), getObjectDetector()])
    this.faceReady = true
    this.objectReady = true

    this.faceTimer = window.setInterval(() => {
      void this.tickFaces()
    }, FACE_INTERVAL_MS)

    this.objectTimer = window.setInterval(() => {
      void this.tickObjects()
    }, OBJECT_INTERVAL_MS)

    this.sampleTimer = window.setInterval(() => {
      void this.enqueueFrame('heartbeat', 'sample', { kind: 'periodic' })
    }, SAMPLE_INTERVAL_MS)

    this.screenshotTimer = window.setInterval(() => {
      void this.enqueueExamScreenshot('heartbeat_screen', 'sample')
    }, SCREENSHOT_INTERVAL_MS)

    void this.enqueueFrame('exam_start', 'sample', { kind: 'start' })
    void this.enqueueExamScreenshot('exam_start_screen', 'sample')
  }

  async stop() {
    this.running = false
    if (this.faceTimer) window.clearInterval(this.faceTimer)
    if (this.objectTimer) window.clearInterval(this.objectTimer)
    if (this.sampleTimer) window.clearInterval(this.sampleTimer)
    if (this.screenshotTimer) window.clearInterval(this.screenshotTimer)
    this.faceTimer = null
    this.objectTimer = null
    this.sampleTimer = null
    this.screenshotTimer = null
    await this.queue.flush(6_000)
    this.queue.stop()
  }

  getUploadStats() {
    return this.queue.getStats()
  }

  private claimEmission(type: VideoViolationType): boolean {
    const now = Date.now()
    const last = this.lastViolationAt.get(type) ?? 0
    if (now - last < VIOLATION_COOLDOWN_MS) return false
    this.lastViolationAt.set(type, now)
    return true
  }

  private clearActive(types: VideoViolationType[]) {
    const cleared = types.filter((type) => {
      if (type === 'no_face' && this.activeNoFace) {
        this.activeNoFace = false
        return true
      }
      if (type === 'multi_face' && this.activeMultiFace) {
        this.activeMultiFace = false
        return true
      }
      return false
    })
    if (cleared.length > 0) this.callbacks.onClearFindings?.(cleared)
  }

  private async publishFindings(findings: VideoProctorFinding[], sample: FaceSample | null) {
    const emitted: VideoProctorFinding[] = []
    for (const finding of findings) {
      if (!this.claimEmission(finding.type)) continue
      if (finding.type === 'no_face') this.activeNoFace = true
      if (finding.type === 'multi_face') this.activeMultiFace = true
      emitted.push(finding)
      await this.enqueueFrame(finding.type, 'critical', {
        finding,
        sample: sample
          ? {
              faceConfidence: sample.faceConfidence,
              boundingBox: sample.boundingBox,
              leftEye: sample.leftEye,
              rightEye: sample.rightEye,
              headPose: sample.headPose,
              capturedAt: sample.capturedAt,
            }
          : null,
      })
      await this.enqueueExamScreenshot(`screen_${finding.type}`, 'critical')
    }

    if (emitted.length > 0) {
      this.callbacks.onFindings(emitted, sample)
    }
    this.callbacks.onQueueStats?.(this.queue.getStats())
  }

  private async tickFaces() {
    if (!this.running || !this.faceReady || this.video.readyState < 2) return

    try {
      const landmarker = await getFaceLandmarker()
      const detected = detectFaces(landmarker, this.video)
      const findings: VideoProctorFinding[] = []
      const primary = detected.samples[0] ?? null

      // faceCount === -1 means detect threw / unreliable frame — skip, do not invent no_face
      if (detected.faceCount < 0) {
        return
      }

      if (detected.faceCount === 0) {
        this.noFaceStreak += 1
        this.multiFaceStreak = 0
        if (this.noFaceStreak >= NO_FACE_STREAK_REQUIRED) {
          findings.push({
            type: 'no_face',
            confidence: Math.min(1, this.noFaceStreak / NO_FACE_STREAK_REQUIRED),
            details: { streak: this.noFaceStreak },
          })
        }
      } else if (detected.faceCount > 1) {
        this.multiFaceStreak += 1
        this.noFaceStreak = 0
        this.clearActive(['no_face'])
        if (this.multiFaceStreak >= MULTI_FACE_STREAK_REQUIRED) {
          findings.push({
            type: 'multi_face',
            confidence: Math.min(1, detected.faceCount / 3),
            details: { faceCount: detected.faceCount, streak: this.multiFaceStreak },
          })
        }
      } else {
        this.noFaceStreak = 0
        this.multiFaceStreak = 0
        this.clearActive(['no_face', 'multi_face'])
      }

      if (primary) {
        if (primary.leftEye.blink && primary.rightEye.blink) {
          findings.push({ type: 'eyes_closed', confidence: 0.9 })
        }

        if (isGazeOutsideCalibration(primary, this.profile, this.gazeEnvelope)) {
          const nearest = nearestGazePoint(primary, this.profile)
          findings.push({
            type: 'gaze_off_screen',
            confidence: 0.85,
            details: {
              nearest,
              envelope: this.gazeEnvelope,
              leftGaze: primary.leftEye.gaze,
              rightGaze: primary.rightEye.gaze,
            },
          })
        }

        if (isHeadPoseAnomalous(primary.headPose, this.headEnvelope)) {
          const delta = headPoseDelta(primary.headPose, this.headEnvelope.straight)
          findings.push({
            type: 'head_pose_anomaly',
            confidence: Math.min(
              1,
              Math.max(Math.abs(delta.yaw) / 40, Math.abs(delta.pitch) / 35),
            ),
            details: {
              delta,
              envelope: {
                yawMin: this.headEnvelope.yawMin,
                yawMax: this.headEnvelope.yawMax,
                pitchMin: this.headEnvelope.pitchMin,
                pitchMax: this.headEnvelope.pitchMax,
              },
              current: primary.headPose,
            },
          })
        }
      }

      if (findings.length > 0) {
        await this.publishFindings(findings, primary)
      } else {
        this.callbacks.onQueueStats?.(this.queue.getStats())
      }
    } catch {
      return
    }
  }

  private async tickObjects() {
    if (!this.running || !this.objectReady || this.video.readyState < 2) return

    try {
      const detector = await getObjectDetector()
      const objects = detectProhibitedObjects(detector, this.video, performance.now())
      const findings: VideoProctorFinding[] = []

      const hasPhone = objects.some((item) => item.label === 'phone')
      const hasBook = objects.some((item) => item.label === 'book')

      this.phoneStreak = hasPhone ? this.phoneStreak + 1 : 0
      this.bookStreak = hasBook ? this.bookStreak + 1 : 0

      // Require 2 consecutive hits to reduce single-frame false positives.
      if (this.phoneStreak >= 2) {
        const phone = objects.find((item) => item.label === 'phone')
        findings.push({
          type: 'phone_detected',
          confidence: phone?.score ?? 0.7,
          details: { box: phone?.box, streak: this.phoneStreak },
        })
      }
      if (this.bookStreak >= 2) {
        const book = objects.find((item) => item.label === 'book')
        findings.push({
          type: 'book_detected',
          confidence: book?.score ?? 0.7,
          details: { box: book?.box, streak: this.bookStreak },
        })
      }

      if (findings.length > 0) {
        await this.publishFindings(findings, null)
      }
    } catch {
      return
    }
  }

  private async enqueueFrame(
    reason: string,
    priority: 'critical' | 'sample',
    meta: Record<string, unknown>,
  ) {
    const quality = priority === 'critical' ? 0.72 : 0.55
    const blob = await captureVideoFrame(this.video, quality)
    if (!blob) {
      this.webcamFailStreak += 1
      if (this.webcamFailStreak >= 3 && !this.notifiedWebcamFail) {
        this.notifiedWebcamFail = true
        this.callbacks.onIntegrityEvent?.('proctor_webcam_failed', {
          streak: this.webcamFailStreak,
          reason,
          videoReadyState: this.video.readyState,
          videoWidth: this.video.videoWidth,
        })
      }
      return
    }

    this.webcamFailStreak = 0
    this.notifiedWebcamFail = false

    const exam = this.callbacks.getExamContext?.() ?? {}
    this.queue.enqueue({
      attemptId: this.attemptId,
      priority,
      reason,
      blob,
      folder: 'frames',
      meta: {
        ...meta,
        captureType: 'webcam',
        ...exam,
      },
    })
    this.callbacks.onQueueStats?.(this.queue.getStats())
  }

  private async enqueueExamScreenshot(
    reason: string,
    priority: 'critical' | 'sample',
  ) {
    try {
      const base64 = await captureExamScreen()
      if (!base64) {
        this.screenshotFailStreak += 1
        if (this.screenshotFailStreak >= 2 && !this.notifiedScreenshotFail) {
          this.notifiedScreenshotFail = true
          this.callbacks.onIntegrityEvent?.('proctor_screenshot_failed', {
            streak: this.screenshotFailStreak,
            reason,
            note: 'Exam window screenshot unavailable — possible OS capture conflict or IPC failure',
          })
        }
        return
      }

      this.screenshotFailStreak = 0
      this.notifiedScreenshotFail = false

      const blob = base64JpegToBlob(base64)
      const exam = this.callbacks.getExamContext?.() ?? {}
      this.queue.enqueue({
        attemptId: this.attemptId,
        priority,
        reason,
        blob,
        folder: 'screenshots',
        meta: {
          captureType: 'exam_screen',
          includes: ['question_ui', 'webcam_panel'],
          ...exam,
        },
      })
      this.callbacks.onQueueStats?.(this.queue.getStats())
    } catch (error) {
      this.screenshotFailStreak += 1
      if (this.screenshotFailStreak >= 2 && !this.notifiedScreenshotFail) {
        this.notifiedScreenshotFail = true
        this.callbacks.onIntegrityEvent?.('proctor_screenshot_failed', {
          streak: this.screenshotFailStreak,
          reason,
          message: error instanceof Error ? error.message : 'unknown',
        })
      }
    }
  }
}

function buildGazeEnvelope(profile: CalibrationProfile) {
  const points: Point2D[] = []
  for (const entry of Object.values(profile.gazeMap)) {
    points.push(entry.leftGaze, entry.rightGaze)
  }
  if (points.length === 0) {
    return { minX: -1, maxX: 1, minY: -1, maxY: 1 }
  }
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  return {
    minX: Math.min(...xs) - GAZE_ENVELOPE_PAD,
    maxX: Math.max(...xs) + GAZE_ENVELOPE_PAD,
    minY: Math.min(...ys) - GAZE_ENVELOPE_PAD,
    maxY: Math.max(...ys) + GAZE_ENVELOPE_PAD,
  }
}

function buildHeadEnvelope(profile: CalibrationProfile) {
  const poses = Object.values(profile.headPoseBaselines)
  const straight = profile.headPoseBaselines.look_straight ?? poses[0] ?? {
    pitch: 0,
    yaw: 0,
    roll: 0,
  }
  if (poses.length === 0) {
    return {
      yawMin: -HEAD_YAW_HARD_LIMIT,
      yawMax: HEAD_YAW_HARD_LIMIT,
      pitchMin: -HEAD_PITCH_HARD_LIMIT,
      pitchMax: HEAD_PITCH_HARD_LIMIT,
      straight,
    }
  }
  const yaws = poses.map((p) => p.yaw)
  const pitches = poses.map((p) => p.pitch)
  const yawPad = 6
  const pitchPad = 6
  return {
    yawMin: Math.min(...yaws) - yawPad,
    yawMax: Math.max(...yaws) + yawPad,
    pitchMin: Math.min(...pitches) - pitchPad,
    pitchMax: Math.max(...pitches) + pitchPad,
    straight,
  }
}

function pointOutside(
  point: Point2D,
  envelope: { minX: number; maxX: number; minY: number; maxY: number },
) {
  return (
    point.x < envelope.minX ||
    point.x > envelope.maxX ||
    point.y < envelope.minY ||
    point.y > envelope.maxY
  )
}

function isGazeOutsideCalibration(
  sample: FaceSample,
  profile: CalibrationProfile,
  envelope: { minX: number; maxX: number; minY: number; maxY: number },
) {
  const leftOut = pointOutside(sample.leftEye.gaze, envelope)
  const rightOut = pointOutside(sample.rightEye.gaze, envelope)
  if (!(leftOut && rightOut)) return false

  // Also require drift past the nearest calibrated point so tiny envelope noise is ignored.
  const nearest = nearestGazePoint(sample, profile)
  return nearest.score > GAZE_ENVELOPE_PAD * 2.2
}

function nearestGazePoint(sample: FaceSample, profile: CalibrationProfile) {
  let best: { id: CalibrationPointId | null; score: number } = { id: null, score: Number.POSITIVE_INFINITY }
  for (const [id, entry] of Object.entries(profile.gazeMap) as Array<
    [CalibrationPointId, CalibrationProfile['gazeMap'][CalibrationPointId]]
  >) {
    const left = Math.hypot(
      sample.leftEye.gaze.x - entry.leftGaze.x,
      sample.leftEye.gaze.y - entry.leftGaze.y,
    )
    const right = Math.hypot(
      sample.rightEye.gaze.x - entry.rightGaze.x,
      sample.rightEye.gaze.y - entry.rightGaze.y,
    )
    const score = (left + right) / 2
    if (score < best.score) best = { id, score }
  }
  return best
}

function isHeadPoseAnomalous(
  pose: HeadPose,
  envelope: {
    yawMin: number
    yawMax: number
    pitchMin: number
    pitchMax: number
    straight: HeadPose
  },
) {
  const outsideEnvelope =
    pose.yaw < envelope.yawMin ||
    pose.yaw > envelope.yawMax ||
    pose.pitch < envelope.pitchMin ||
    pose.pitch > envelope.pitchMax

  const delta = headPoseDelta(pose, envelope.straight)
  const beyondHardLimit =
    Math.abs(delta.yaw) > HEAD_YAW_HARD_LIMIT || Math.abs(delta.pitch) > HEAD_PITCH_HARD_LIMIT

  return outsideEnvelope || beyondHardLimit
}
