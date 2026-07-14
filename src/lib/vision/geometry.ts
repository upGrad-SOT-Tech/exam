import type { HeadPose, Point2D, Point3D } from './types'

const LEFT_IRIS = 468
const RIGHT_IRIS = 473
const LEFT_EYE = [33, 160, 158, 133, 153, 144] as const
const RIGHT_EYE = [362, 385, 387, 263, 373, 380] as const

export function landmarkToPoint(landmark: { x: number; y: number; z?: number }): Point3D {
  return { x: landmark.x, y: landmark.y, z: landmark.z ?? 0 }
}

export function averagePoints(points: Point2D[]): Point2D {
  if (points.length === 0) return { x: 0, y: 0 }
  const sum = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 },
  )
  return { x: sum.x / points.length, y: sum.y / points.length }
}

function eyeAspectRatio(landmarks: Point3D[], indices: readonly number[]): number {
  const points = indices.map((index) => landmarks[index]).filter(Boolean)
  if (points.length < 6) return 0
  const vertical1 = Math.hypot(points[1].x - points[5].x, points[1].y - points[5].y)
  const vertical2 = Math.hypot(points[2].x - points[4].x, points[2].y - points[4].y)
  const horizontal = Math.hypot(points[0].x - points[3].x, points[0].y - points[3].y)
  if (horizontal === 0) return 0
  return (vertical1 + vertical2) / (2 * horizontal)
}

export function extractEyeMetrics(
  landmarks: Point3D[],
  side: 'left' | 'right',
  blinkScore: number,
): { iris: Point2D; openness: number; blink: boolean; gaze: Point2D } {
  const irisIndex = side === 'left' ? LEFT_IRIS : RIGHT_IRIS
  const eyeIndices = side === 'left' ? LEFT_EYE : RIGHT_EYE
  const iris = landmarks[irisIndex] ?? { x: 0, y: 0, z: 0 }
  const openness = eyeAspectRatio(landmarks, eyeIndices)
  const eyeCenter = averagePoints(eyeIndices.map((index) => landmarks[index]).filter(Boolean))
  return {
    iris: { x: iris.x, y: iris.y },
    openness,
    blink: blinkScore > 0.5 || openness < 0.16,
    gaze: {
      x: iris.x - eyeCenter.x,
      y: iris.y - eyeCenter.y,
    },
  }
}

export function matrixToHeadPose(matrix: number[]): HeadPose {
  const r00 = matrix[0] ?? 1
  const r01 = matrix[1] ?? 0
  const r02 = matrix[2] ?? 0
  const r12 = matrix[6] ?? 0
  const r22 = matrix[10] ?? 1

  const pitch = Math.atan2(-r12, r22) * (180 / Math.PI)
  const yaw = Math.asin(Math.max(-1, Math.min(1, r02))) * (180 / Math.PI)
  const roll = Math.atan2(-r01, r00) * (180 / Math.PI)

  return {
    pitch: Number.isFinite(pitch) ? pitch : 0,
    yaw: Number.isFinite(yaw) ? yaw : 0,
    roll: Number.isFinite(roll) ? roll : 0,
  }
}

export function averageHeadPose(poses: HeadPose[]): HeadPose {
  if (poses.length === 0) return { pitch: 0, roll: 0, yaw: 0 }
  const sum = poses.reduce(
    (acc, pose) => ({
      pitch: acc.pitch + pose.pitch,
      roll: acc.roll + pose.roll,
      yaw: acc.yaw + pose.yaw,
    }),
    { pitch: 0, roll: 0, yaw: 0 },
  )
  return {
    pitch: sum.pitch / poses.length,
    roll: sum.roll / poses.length,
    yaw: sum.yaw / poses.length,
  }
}

export function averageEyeMetrics(
  metrics: Array<{ iris: Point2D; openness: number; blink: boolean; gaze: Point2D }>,
) {
  if (metrics.length === 0) {
    return {
      iris: { x: 0, y: 0 },
      openness: 0,
      blink: false,
      gaze: { x: 0, y: 0 },
    }
  }
  return {
    iris: averagePoints(metrics.map((item) => item.iris)),
    openness: metrics.reduce((total, item) => total + item.openness, 0) / metrics.length,
    blink: metrics.filter((item) => item.blink).length > metrics.length / 2,
    gaze: averagePoints(metrics.map((item) => item.gaze)),
  }
}

export function headPoseDelta(current: HeadPose, baseline: HeadPose): HeadPose {
  return {
    pitch: current.pitch - baseline.pitch,
    roll: current.roll - baseline.roll,
    yaw: current.yaw - baseline.yaw,
  }
}

export { LEFT_EYE, RIGHT_EYE, LEFT_IRIS, RIGHT_IRIS }
