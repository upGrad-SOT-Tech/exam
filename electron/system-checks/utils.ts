import type { CheckDefinition, CheckResult, CheckStatus } from './types'

export function createResult(
  definition: CheckDefinition,
  status: CheckStatus,
  message: string,
  startedAt: number,
  details?: Record<string, unknown>,
): CheckResult {
  return {
    id: definition.id,
    label: definition.label,
    status,
    severity: definition.severity,
    message,
    details,
    durationMs: Date.now() - startedAt,
  }
}

export function normalizeProcessName(name: string): string {
  return name.toLowerCase().replace(/\.exe$/i, '').trim()
}

export function matchProcessList(processName: string, patterns: string[]): boolean {
  const normalized = normalizeProcessName(processName)
  return patterns.some((pattern) => normalized.includes(pattern.toLowerCase()))
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

export function randomRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}
