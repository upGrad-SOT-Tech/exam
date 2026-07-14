import { screen } from 'electron'
import type { CheckDefinition, CheckResult } from '../types'
import { MIN_SCREEN_HEIGHT, MIN_SCREEN_WIDTH } from '../constants'
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

export function collectMultipleMonitors(definition: CheckDefinition): CheckResult {
  const startedAt = Date.now()
  const displays = screen.getAllDisplays()
  const count = displays.length

  if (count <= 1) {
    return createResult(definition, 'passed', 'Single monitor detected', startedAt, {
      count,
      displays: displays.map((display) => ({
        id: display.id,
        width: display.size.width,
        height: display.size.height,
      })),
    })
  }

  return createResult(
    definition,
    'failed',
    `${count} monitors detected — disconnect additional displays before continuing`,
    startedAt,
    {
      count,
      displays: displays.map((display) => ({
        id: display.id,
        width: display.size.width,
        height: display.size.height,
      })),
    },
  )
}
