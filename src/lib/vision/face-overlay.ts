import type { FaceBoundingBox } from '@/lib/vision/types'

export function mapCoverFaceBox(
  box: FaceBoundingBox,
  video: HTMLVideoElement,
  container: HTMLElement,
): { left: number; top: number; width: number; height: number } | null {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (vw < 2 || vh < 2) return null

  const cw = container.clientWidth
  const ch = container.clientHeight
  if (cw < 2 || ch < 2) return null

  const videoAspect = vw / vh
  const coverAspect = cw / ch

  let drawW: number
  let drawH: number
  let offsetX: number
  let offsetY: number

  if (videoAspect > coverAspect) {
    drawH = ch
    drawW = ch * videoAspect
    offsetX = (cw - drawW) / 2
    offsetY = 0
  } else {
    drawW = cw
    drawH = cw / videoAspect
    offsetX = 0
    offsetY = (ch - drawH) / 2
  }

  // Tight pad: ~8% width, ~10% height — accurate face frame, not head+shoulders
  const padX = Math.max(0.012, box.width * 0.08)
  const padY = Math.max(0.016, box.height * 0.1)
  const xMin = Math.max(0, box.xMin - padX)
  const yMin = Math.max(0, box.yMin - padY)
  const xMax = Math.min(1, box.xMin + box.width + padX)
  const yMax = Math.min(1, box.yMin + box.height + padY)

  return {
    left: offsetX + xMin * drawW,
    top: offsetY + yMin * drawH,
    width: Math.max(28, (xMax - xMin) * drawW),
    height: Math.max(36, (yMax - yMin) * drawH),
  }
}

export const STATIC_FACE_GUIDE = {
  widthPct: 34,
  heightPct: 48,
  topPct: 48,
} as const
