import type { CheckDefinition, CheckResult } from '../types'
import { createResult } from '../utils'
import { isClipboardEmpty } from '../clipboard'

export function collectClipboard(definition: CheckDefinition): CheckResult {
  const startedAt = Date.now()
  const empty = isClipboardEmpty()

  if (empty) {
    return createResult(definition, 'passed', 'Clipboard is empty', startedAt, {
      formatCount: 0,
    })
  }

  return createResult(
    definition,
    'warning',
    'Clipboard contains data — clear it before starting the exam',
    startedAt,
    { hasClipboardData: true },
  )
}
