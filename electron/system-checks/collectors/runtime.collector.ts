import { app } from 'electron'
import type { CheckDefinition, CheckResult } from '../types'
import { createResult } from '../utils'

const MIN_CHROMIUM_MAJOR = 120

export function collectBrowserVersion(definition: CheckDefinition): CheckResult {
  const startedAt = Date.now()
  const chromium = process.versions.chrome ?? ''
  const electron = process.versions.electron ?? ''
  const major = Number.parseInt(chromium.split('.')[0] ?? '0', 10)

  if (major >= MIN_CHROMIUM_MAJOR) {
    return createResult(
      definition,
      'passed',
      `Chromium ${chromium} (Electron ${electron}, app ${app.getVersion()})`,
      startedAt,
      {
        chromium,
        electron,
        appVersion: app.getVersion(),
        minChromiumMajor: MIN_CHROMIUM_MAJOR,
      },
    )
  }

  return createResult(
    definition,
    'failed',
    `Unsupported runtime Chromium ${chromium} — update the application`,
    startedAt,
    {
      chromium,
      electron,
      appVersion: app.getVersion(),
      minChromiumMajor: MIN_CHROMIUM_MAJOR,
    },
  )
}
