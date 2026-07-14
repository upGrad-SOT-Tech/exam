import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision'
import {
  averageEyeMetrics,
  averageHeadPose,
  extractEyeMetrics,
  landmarkToPoint,
  matrixToHeadPose,
} from './geometry'
import type { FaceBoundingBox, FaceSample, Point3D } from './types'

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const FACE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

let faceLandmarkerPromise: Promise<FaceLandmarker> | null = null
let lastVideoTimestampMs = -1


export function nextVisionTimestamp(preferredMs = performance.now()): number {
  const next = preferredMs <= lastVideoTimestampMs ? lastVideoTimestampMs + 1 : preferredMs
  lastVideoTimestampMs = next
  return next
}

export async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (!faceLandmarkerPromise) {
    faceLandmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT)
      try {
        return await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: FACE_MODEL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 3,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        })
      } catch {
        return FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: FACE_MODEL,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numFaces: 3,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        })
      }
    })().catch((error) => {
      faceLandmarkerPromise = null
      throw error
    })
  }
  return faceLandmarkerPromise
}

function blendshapeScore(
  result: FaceLandmarkerResult,
  faceIndex: number,
  name: string,
): number {
  const categories = result.faceBlendshapes?.[faceIndex]?.categories ?? []
  const match = categories.find((item) => item.categoryName === name)
  return match?.score ?? 0
}

function boundingBoxFromLandmarks(landmarks: Point3D[]): FaceBoundingBox {
  let xMin = 1
  let yMin = 1
  let xMax = 0
  let yMax = 0
  for (const point of landmarks) {
    xMin = Math.min(xMin, point.x)
    yMin = Math.min(yMin, point.y)
    xMax = Math.max(xMax, point.x)
    yMax = Math.max(yMax, point.y)
  }
  return {
    xMin,
    yMin,
    width: Math.max(0, xMax - xMin),
    height: Math.max(0, yMax - yMin),
  }
}

export type FaceDetectionFrame = {
  faceCount: number
  samples: FaceSample[]
  raw: FaceLandmarkerResult
}

export function detectFaces(
  landmarker: FaceLandmarker,
  video: HTMLVideoElement,
  timestampMs: number = performance.now(),
): FaceDetectionFrame {
  if (video.readyState < 2 || video.videoWidth < 2 || video.videoHeight < 2) {
    return {
      faceCount: 0,
      samples: [],
      raw: { faceLandmarks: [] } as FaceLandmarkerResult,
    }
  }

  let raw: FaceLandmarkerResult
  try {
    raw = landmarker.detectForVideo(video, nextVisionTimestamp(timestampMs))
  } catch {
    // Timestamp / WASM glitches can throw; never treat as a hard missing-face signal.
    try {
      raw = landmarker.detectForVideo(video, nextVisionTimestamp(performance.now() + 16))
    } catch {
      return {
        faceCount: -1,
        samples: [],
        raw: { faceLandmarks: [] } as FaceLandmarkerResult,
      }
    }
  }

  const samples: FaceSample[] = (raw.faceLandmarks ?? []).map((face, index) => {
    const landmarks = face.map(landmarkToPoint)
    const matrix = raw.facialTransformationMatrixes?.[index]?.data ?? []
    const leftBlink = blendshapeScore(raw, index, 'eyeBlinkLeft')
    const rightBlink = blendshapeScore(raw, index, 'eyeBlinkRight')
    return {
      capturedAt: new Date().toISOString(),
      faceConfidence: 1 - (leftBlink + rightBlink) / 4,
      boundingBox: boundingBoxFromLandmarks(landmarks),
      landmarks,
      leftEye: extractEyeMetrics(landmarks, 'left', leftBlink),
      rightEye: extractEyeMetrics(landmarks, 'right', rightBlink),
      headPose: matrixToHeadPose(Array.from(matrix)),
      screen: {
        width: window.screen.width,
        height: window.screen.height,
      },
    }
  })

  return {
    faceCount: samples.length,
    samples,
    raw,
  }
}

export async function captureFaceBurst(
  landmarker: FaceLandmarker,
  video: HTMLVideoElement,
  frameCount = 24,
  intervalMs = 33,
): Promise<FaceSample[]> {
  const samples: FaceSample[] = []
  for (let index = 0; index < frameCount; index += 1) {
    const detected = detectFaces(landmarker, video, performance.now())
    if (detected.samples[0]) samples.push(detected.samples[0])
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs))
  }
  return samples
}

export function aggregateFaceSamples(samples: FaceSample[]) {
  if (samples.length === 0) {
    throw new Error('No face samples captured')
  }

  const boundingBox = {
    xMin: samples.reduce((total, item) => total + item.boundingBox.xMin, 0) / samples.length,
    yMin: samples.reduce((total, item) => total + item.boundingBox.yMin, 0) / samples.length,
    width: samples.reduce((total, item) => total + item.boundingBox.width, 0) / samples.length,
    height: samples.reduce((total, item) => total + item.boundingBox.height, 0) / samples.length,
  }

  return {
    faceConfidence:
      samples.reduce((total, item) => total + item.faceConfidence, 0) / samples.length,
    boundingBox,
    leftEye: averageEyeMetrics(samples.map((item) => item.leftEye)),
    rightEye: averageEyeMetrics(samples.map((item) => item.rightEye)),
    headPose: averageHeadPose(samples.map((item) => item.headPose)),
  }
}
