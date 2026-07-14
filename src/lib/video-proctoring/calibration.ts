import {
  aggregateFaceSamples,
  captureFaceBurst,
  getFaceLandmarker,
} from '@/lib/vision/face-landmarker'
import type {
  CalibrationCapture,
  CalibrationPointId,
  CalibrationProfile,
  FaceSample,
  HeadPoseLabel,
} from '@/lib/vision/types'
import { HEAD_POSE_STEPS, NINE_POINT_GRID } from '@/lib/vision/types'

export async function collectBurstSamples(
  video: HTMLVideoElement,
  frameCount = 24,
): Promise<FaceSample[]> {
  const landmarker = await getFaceLandmarker()
  const samples = await captureFaceBurst(landmarker, video, frameCount, 30)
  if (samples.length < 8) {
    throw new Error('Unable to lock your face. Stay centered and well lit.')
  }
  return samples
}

export function buildGazeCapture(
  pointId: CalibrationPointId,
  samples: FaceSample[],
  clickedAt: string,
  clickX: number,
  clickY: number,
  nx?: number,
  ny?: number,
): CalibrationCapture {
  const dot = NINE_POINT_GRID.find((item) => item.id === pointId)
  if (!dot) throw new Error('Invalid calibration point')

  return {
    kind: 'gaze_point',
    label: pointId,
    clickedAt,
    dot: {
      x: clickX,
      y: clickY,
      nx: nx ?? dot.nx,
      ny: ny ?? dot.ny,
    },
    samples,
    aggregate: aggregateFaceSamples(samples),
  }
}

export function buildHeadPoseCapture(
  label: HeadPoseLabel,
  samples: FaceSample[],
  clickedAt: string,
): CalibrationCapture {
  return {
    kind: 'head_pose',
    label,
    clickedAt,
    samples,
    aggregate: aggregateFaceSamples(samples),
  }
}

function uniqueByLabel(captures: CalibrationCapture[]): CalibrationCapture[] {
  const map = new Map<string, CalibrationCapture>()
  for (const capture of captures) {
    map.set(`${capture.kind}:${capture.label}`, capture)
  }
  return Array.from(map.values())
}

export function countCalibrationProgress(captures: CalibrationCapture[]) {
  const unique = uniqueByLabel(captures)
  const headDone = unique.filter((item) => item.kind === 'head_pose').length
  const gazeDone = unique.filter((item) => item.kind === 'gaze_point').length
  const total = HEAD_POSE_STEPS.length + NINE_POINT_GRID.length
  const completed = Math.min(total, headDone + gazeDone)
  return {
    headDone,
    gazeDone,
    completed,
    total,
    percent: Math.min(100, Math.round((completed / total) * 100)),
    isComplete: headDone >= HEAD_POSE_STEPS.length && gazeDone >= NINE_POINT_GRID.length,
  }
}

export function buildCalibrationProfile(captures: CalibrationCapture[]): CalibrationProfile {
  const unique = uniqueByLabel(captures)
  const gazeCaptures = unique.filter((item) => item.kind === 'gaze_point')
  const headCaptures = unique.filter((item) => item.kind === 'head_pose')

  const missingGaze = NINE_POINT_GRID.filter(
    (point) => !gazeCaptures.some((capture) => capture.label === point.id),
  )
  const missingHead = HEAD_POSE_STEPS.filter(
    (step) => !headCaptures.some((capture) => capture.label === step.label),
  )

  if (missingHead.length > 0) {
    throw new Error(`Head pose calibration incomplete (${missingHead.length} remaining)`)
  }
  if (missingGaze.length > 0) {
    throw new Error(`Nine-point gaze calibration incomplete (${missingGaze.length} remaining)`)
  }

  const gazeMap = {} as CalibrationProfile['gazeMap']
  for (const point of NINE_POINT_GRID) {
    const capture = gazeCaptures.find((item) => item.label === point.id)
    if (!capture) continue
    gazeMap[point.id] = {
      leftIris: capture.aggregate.leftEye.iris,
      rightIris: capture.aggregate.rightEye.iris,
      leftGaze: capture.aggregate.leftEye.gaze,
      rightGaze: capture.aggregate.rightEye.gaze,
      headPose: capture.aggregate.headPose,
    }
  }

  const headPoseBaselines = {} as CalibrationProfile['headPoseBaselines']
  for (const step of HEAD_POSE_STEPS) {
    const capture = headCaptures.find((item) => item.label === step.label)
    if (!capture) continue
    headPoseBaselines[step.label] = capture.aggregate.headPose
  }

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    screen: {
      width: window.screen.width,
      height: window.screen.height,
    },
    captures: unique,
    gazeMap,
    headPoseBaselines,
  }
}
