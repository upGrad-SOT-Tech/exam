export type Point2D = { x: number; y: number }
export type Point3D = { x: number; y: number; z: number }

export type FaceBoundingBox = {
  xMin: number
  yMin: number
  width: number
  height: number
}

export type HeadPose = {
  pitch: number
  roll: number
  yaw: number
}

export type EyeMetrics = {
  iris: Point2D
  openness: number
  blink: boolean
  gaze: Point2D
}

export type FaceSample = {
  capturedAt: string
  faceConfidence: number
  boundingBox: FaceBoundingBox
  landmarks: Point3D[]
  leftEye: EyeMetrics
  rightEye: EyeMetrics
  headPose: HeadPose
  screen: {
    width: number
    height: number
  }
}

export type HeadPoseLabel =
  | 'look_straight'
  | 'turn_left'
  | 'turn_right'
  | 'look_up'
  | 'look_down'

export type CalibrationPointId =
  | 'p0'
  | 'p1'
  | 'p2'
  | 'p3'
  | 'p4'
  | 'p5'
  | 'p6'
  | 'p7'
  | 'p8'

export type CalibrationDot = {
  id: CalibrationPointId
  nx: number
  ny: number
}

export type CalibrationCapture = {
  kind: 'gaze_point' | 'head_pose'
  label: CalibrationPointId | HeadPoseLabel
  clickedAt: string
  dot?: { x: number; y: number; nx: number; ny: number }
  samples: FaceSample[]
  aggregate: {
    faceConfidence: number
    boundingBox: FaceBoundingBox
    leftEye: EyeMetrics
    rightEye: EyeMetrics
    headPose: HeadPose
  }
}

export type CalibrationProfile = {
  version: 1
  createdAt: string
  screen: { width: number; height: number }
  captures: CalibrationCapture[]
  gazeMap: Record<
    CalibrationPointId,
    {
      leftIris: Point2D
      rightIris: Point2D
      leftGaze: Point2D
      rightGaze: Point2D
      headPose: HeadPose
    }
  >
  headPoseBaselines: Record<HeadPoseLabel, HeadPose>
}

export type VideoViolationType =
  | 'no_face'
  | 'multi_face'
  | 'phone_detected'
  | 'book_detected'
  | 'gaze_off_screen'
  | 'head_pose_anomaly'
  | 'eyes_closed'

export type VideoProctorFinding = {
  type: VideoViolationType
  confidence: number
  details?: Record<string, unknown>
}

export type FrameUploadPriority = 'critical' | 'sample'

export type FrameUploadJob = {
  id: string
  attemptId: string
  priority: FrameUploadPriority
  reason: string
  blob: Blob
  meta: Record<string, unknown>
  createdAt: number
  attempts: number
}

export const NINE_POINT_GRID: CalibrationDot[] = [
  { id: 'p0', nx: 0.03, ny: 0.04 },
  { id: 'p1', nx: 0.5, ny: 0.04 },
  { id: 'p2', nx: 0.97, ny: 0.04 },
  { id: 'p3', nx: 0.03, ny: 0.5 },
  { id: 'p4', nx: 0.5, ny: 0.5 },
  { id: 'p5', nx: 0.97, ny: 0.5 },
  { id: 'p6', nx: 0.03, ny: 0.96 },
  { id: 'p7', nx: 0.5, ny: 0.96 },
  { id: 'p8', nx: 0.97, ny: 0.96 },
]

export const GAZE_DOT_SIZE_PX = 44

export const MIN_GAZE_CALIBRATION_SIZE = { width: 1100, height: 700 }


export function buildEdgeNinePointGrid(
  width = window.innerWidth,
  height = window.innerHeight,
  dotSizePx = GAZE_DOT_SIZE_PX,
): CalibrationDot[] {
  const insetX = Math.max(dotSizePx / 2 + 4, width * 0.012) / width
  const insetY = Math.max(dotSizePx / 2 + 4, height * 0.012) / height
  return [
    { id: 'p0', nx: insetX, ny: insetY },
    { id: 'p1', nx: 0.5, ny: insetY },
    { id: 'p2', nx: 1 - insetX, ny: insetY },
    { id: 'p3', nx: insetX, ny: 0.5 },
    { id: 'p4', nx: 0.5, ny: 0.5 },
    { id: 'p5', nx: 1 - insetX, ny: 0.5 },
    { id: 'p6', nx: insetX, ny: 1 - insetY },
    { id: 'p7', nx: 0.5, ny: 1 - insetY },
    { id: 'p8', nx: 1 - insetX, ny: 1 - insetY },
  ]
}

export function isViewportReadyForGazeCalibration(
  width = window.innerWidth,
  height = window.innerHeight,
): boolean {
  return width >= MIN_GAZE_CALIBRATION_SIZE.width && height >= MIN_GAZE_CALIBRATION_SIZE.height
}

export const HEAD_POSE_STEPS: Array<{
  label: HeadPoseLabel
  title: string
  instruction: string
}> = [
  { label: 'look_straight', title: 'Look straight', instruction: 'Face the camera directly and keep your head still.' },
  { label: 'turn_left', title: 'Turn left', instruction: 'Slowly turn your head to the left while keeping eyes open.' },
  { label: 'turn_right', title: 'Turn right', instruction: 'Slowly turn your head to the right while keeping eyes open.' },
  { label: 'look_up', title: 'Look up', instruction: 'Tilt your chin up slightly and look toward the top of the screen.' },
  { label: 'look_down', title: 'Look down', instruction: 'Tilt your chin down slightly and look toward the bottom of the screen.' },
]
