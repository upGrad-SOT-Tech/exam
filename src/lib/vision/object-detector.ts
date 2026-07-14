import { FilesetResolver, ObjectDetector, type Detection } from '@mediapipe/tasks-vision'

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const OBJECT_MODEL =
  'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite'

const PHONE_LABELS = new Set(['cell phone', 'mobile phone', 'phone'])
const BOOK_LABELS = new Set(['book', 'notebook'])

const PHONE_SCORE_MIN = 0.36
const BOOK_SCORE_MIN = 0.4

let objectDetectorPromise: Promise<ObjectDetector> | null = null
let lastObjectTimestampMs = -1

function nextObjectTimestamp(preferredMs = performance.now()): number {
  const next = preferredMs <= lastObjectTimestampMs ? lastObjectTimestampMs + 1 : preferredMs
  lastObjectTimestampMs = next
  return next
}

export async function getObjectDetector(): Promise<ObjectDetector> {
  if (!objectDetectorPromise) {
    objectDetectorPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT)
      try {
        return await ObjectDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: OBJECT_MODEL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          scoreThreshold: 0.3,
          maxResults: 10,
        })
      } catch {
        return ObjectDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: OBJECT_MODEL,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          scoreThreshold: 0.3,
          maxResults: 10,
        })
      }
    })().catch((error) => {
      objectDetectorPromise = null
      throw error
    })
  }
  return objectDetectorPromise
}

export type ObjectFinding = {
  label: 'phone' | 'book'
  score: number
  box: { originX: number; originY: number; width: number; height: number }
}

function mapDetection(detection: Detection): ObjectFinding | null {
  const category = detection.categories?.[0]
  if (!category?.categoryName) return null
  const name = category.categoryName.toLowerCase()
  const box = detection.boundingBox
  if (!box) return null
  const score = category.score ?? 0

  if (PHONE_LABELS.has(name) && score >= PHONE_SCORE_MIN) {
    return {
      label: 'phone',
      score,
      box: {
        originX: box.originX,
        originY: box.originY,
        width: box.width,
        height: box.height,
      },
    }
  }

  if (BOOK_LABELS.has(name) && score >= BOOK_SCORE_MIN) {
    return {
      label: 'book',
      score,
      box: {
        originX: box.originX,
        originY: box.originY,
        width: box.width,
        height: box.height,
      },
    }
  }

  return null
}

export function detectProhibitedObjects(
  detector: ObjectDetector,
  video: HTMLVideoElement,
  timestampMs: number = performance.now(),
): ObjectFinding[] {
  if (video.readyState < 2 || video.videoWidth < 2) return []
  try {
    const result = detector.detectForVideo(video, nextObjectTimestamp(timestampMs))
    const mapped = (result.detections ?? [])
      .map(mapDetection)
      .filter((item): item is ObjectFinding => item !== null)

    // Keep strongest finding per label to avoid duplicate spam.
    const best = new Map<ObjectFinding['label'], ObjectFinding>()
    for (const item of mapped) {
      const prev = best.get(item.label)
      if (!prev || item.score > prev.score) best.set(item.label, item)
    }
    return Array.from(best.values())
  } catch {
    return []
  }
}
