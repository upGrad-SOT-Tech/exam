import type { SystemCheckReport } from './types'

const STORAGE_KEY = 'ugsot.systemChecks'
const TTL_MS = 30 * 60 * 1000

type StoredSession = {
  report: SystemCheckReport
  expiresAt: number
}

export function savePassedSession(report: SystemCheckReport): void {
  const payload: StoredSession = {
    report,
    expiresAt: Date.now() + TTL_MS,
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function clearPassedSession(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}

export function getPassedSession(): SystemCheckReport | null {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as StoredSession
    if (Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    if (!parsed.report?.passed) return null
    return parsed.report
  } catch {
    sessionStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function hasValidPassedSession(): boolean {
  return getPassedSession() !== null
}
