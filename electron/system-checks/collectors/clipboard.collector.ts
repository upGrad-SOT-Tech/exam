import { clipboard } from 'electron'
import type { CheckDefinition, CheckResult } from '../types'
import { createResult } from '../utils'

export function collectClipboard(definition: CheckDefinition): CheckResult {
  const startedAt = Date.now()
  const formats = clipboard.availableFormats()
  const hasText = formats.length > 0 || clipboard.readText().trim().length > 0

  if (!hasText) {
    return createResult(definition, 'passed', 'Clipboard is empty', startedAt, {
      formatCount: formats.length,
    })
  }

  return createResult(
    definition,
    'warning',
    'Clipboard contains data — clear clipboard before starting the exam',
    startedAt,
    { formatCount: formats.length, formats: formats.slice(0, 5) },
  )
}
