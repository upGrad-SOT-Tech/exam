import { screen } from 'electron'
import type { CheckDefinition, CheckResult } from '../types'
import { MIN_SCREEN_HEIGHT, MIN_SCREEN_WIDTH } from '../constants'
import type { SystemSnapshot } from '../snapshot'
import { createResult } from '../utils'

export function collectScreenResolution(definition: CheckDefinition): CheckResult {
  const startedAt = Date.now()
  const primary = screen.getPrimaryDisplay()
  const { width, height } = primary.size
  const scaleFactor = primary.scaleFactor

  if (width >= MIN_SCREEN_WIDTH && height >= MIN_SCREEN_HEIGHT) {
    return createResult(
      definition,
      'passed',
      `${width}×${height} @ ${scaleFactor}x scale`,
      startedAt,
      { width, height, scaleFactor, minWidth: MIN_SCREEN_WIDTH, minHeight: MIN_SCREEN_HEIGHT },
    )
  }

  return createResult(
    definition,
    'failed',
    `Resolution ${width}×${height} is below minimum ${MIN_SCREEN_WIDTH}×${MIN_SCREEN_HEIGHT}`,
    startedAt,
    { width, height, scaleFactor, minWidth: MIN_SCREEN_WIDTH, minHeight: MIN_SCREEN_HEIGHT },
  )
}

type PhysicalDisplay = {
  model?: string
  connection?: string
  builtin?: boolean
  main?: boolean
  width: number | null
  height: number | null
}

function readPhysicalDisplays(snapshot: SystemSnapshot): PhysicalDisplay[] {
  const displays = snapshot.graphics?.displays
  if (!Array.isArray(displays)) return []
  return displays
    .map((display) => ({
      model: typeof display.model === 'string' ? display.model : undefined,
      connection: typeof display.connection === 'string' ? display.connection : undefined,
      builtin: typeof display.builtin === 'boolean' ? display.builtin : undefined,
      main: typeof display.main === 'boolean' ? display.main : undefined,
      width: display.currentResX ?? display.resolutionX ?? null,
      height: display.currentResY ?? display.resolutionY ?? null,
    }))
    // Keep only panels that are actually driving a picture. Drops phantom/inactive
    // entries that some Windows drivers report for a single-monitor setup, which
    // would otherwise false-block a legitimate single external display.
    .filter((display) => (display.width ?? 0) > 0 && (display.height ?? 0) > 0)
}

function describeDisplay(display: PhysicalDisplay): string {
  const parts = [display.connection, display.model].filter(
    (part): part is string => Boolean(part),
  )
  return parts.length > 0 ? parts.join(' ') : 'external display'
}

export function collectMultipleMonitors(
  definition: CheckDefinition,
  snapshot: SystemSnapshot,
): CheckResult {
  const startedAt = Date.now()

  // Electron enumerates each *logical* display. On macOS a mirrored HDMI screen
  // collapses into the primary display's mirror set, so it is NOT counted here —
  // this is how a candidate can share/mirror the exam screen to a second monitor.
  const electronDisplays = screen.getAllDisplays()
  const electronCount = electronDisplays.length

  // systeminformation enumerates each *physical* panel the GPU is driving,
  // including mirrored ones, and tags external HDMI/DisplayPort connections.
  // This is what catches an HDMI screen even when it is mirroring the primary.
  const physicalDisplays = readPhysicalDisplays(snapshot)
  const physicalCount = physicalDisplays.length
  const externalDisplays = physicalDisplays.filter(
    (display) => display.builtin === false,
  )

  // Trust whichever source sees more displays — mirroring hides screens from
  // Electron, while a parse gap could hide them from systeminformation.
  const count = Math.max(electronCount, physicalCount)

  const details = {
    count,
    electronCount,
    physicalCount,
    externalCount: externalDisplays.length,
    displays: physicalDisplays,
    electronDisplays: electronDisplays.map((display) => ({
      id: display.id,
      width: display.size.width,
      height: display.size.height,
    })),
  }

  if (count <= 1) {
    return createResult(definition, 'passed', 'Single display detected', startedAt, details)
  }

  const externalLabel = externalDisplays.map(describeDisplay).join(', ')
  const message = externalLabel
    ? `External display connected (${externalLabel}) — disconnect all external/HDMI screens, including mirrored ones, before continuing`
    : `${count} displays detected — disconnect additional displays, including mirrored/HDMI screens, before continuing`

  return createResult(definition, 'failed', message, startedAt, details)
}
