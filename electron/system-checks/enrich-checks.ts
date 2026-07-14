import type { CheckResult } from './types'
import { type ProcessRef, resolveDetectedApps } from './services/process-apps.service'

function readProcessRefs(details?: Record<string, unknown>): ProcessRef[] {
  if (!details) return []

  const refs: ProcessRef[] = []

  const processes = details.processes
  if (Array.isArray(processes)) {
    for (const entry of processes) {
      if (!entry || typeof entry !== 'object') continue
      const item = entry as Record<string, unknown>
      const name = typeof item.name === 'string' ? item.name : ''
      const pid = typeof item.pid === 'number' ? item.pid : 0
      const processPath = typeof item.path === 'string' ? item.path : undefined
      if (!name) continue
      refs.push({ name, pid, path: processPath })
    }
    return refs
  }

  const flagged = details.flagged
  if (Array.isArray(flagged)) {
    for (const entry of flagged) {
      if (!entry || typeof entry !== 'object') continue
      const item = entry as Record<string, unknown>
      const name = typeof item.name === 'string' ? item.name : ''
      const pid = typeof item.pid === 'number' ? item.pid : 0
      const processPath = typeof item.path === 'string' ? item.path : undefined
      if (!name) continue
      refs.push({ name, pid, path: processPath })
    }
  }

  return refs
}

export async function enrichChecksWithDetectedApps(checks: CheckResult[]): Promise<CheckResult[]> {
  return Promise.all(
    checks.map(async (check) => {
      const processRefs = readProcessRefs(check.details)
      if (processRefs.length === 0) return check

      const detectedApps = await resolveDetectedApps(processRefs)
      return {
        ...check,
        details: {
          ...check.details,
          detectedApps,
        },
      }
    }),
  )
}
