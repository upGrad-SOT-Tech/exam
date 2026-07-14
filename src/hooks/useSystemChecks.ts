import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getCheckDefinitions,
  isSystemChecksAvailable,
  runMediaChecks,
  runSystemChecks,
  submitSystemCheckAudit,
} from '@/lib/system-checks/api'
import { getPassedSession, savePassedSession } from '@/lib/system-checks/session'
import type { CheckDefinition, CheckResult, SystemCheckReport } from '@/lib/system-checks/types'

type RunState = 'idle' | 'running' | 'done' | 'error'

function placeholderChecks(definitions: CheckDefinition[]): CheckResult[] {
  return definitions.map((definition) => ({
    id: definition.id,
    label: definition.label,
    status: 'pending',
    severity: definition.severity,
    message: 'Waiting to run…',
    durationMs: 0,
  }))
}

export function useSystemChecks() {
  const [definitions, setDefinitions] = useState<CheckDefinition[]>([])
  const [checks, setChecks] = useState<CheckResult[]>([])
  const [report, setReport] = useState<SystemCheckReport | null>(() => getPassedSession())
  const [state, setState] = useState<RunState>('idle')
  const [error, setError] = useState<string | null>(null)

  const desktopAvailable = useMemo(() => isSystemChecksAvailable(), [])

  useEffect(() => {
    let cancelled = false

    getCheckDefinitions()
      .then((items) => {
        if (cancelled) return
        setDefinitions(items)
        setChecks(placeholderChecks(items))
      })
      .catch(() => {
        if (cancelled) return
        setError('Unable to load system check configuration')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const runChecks = useCallback(async () => {
    if (!desktopAvailable) {
      setError('System checks require the desktop application')
      return null
    }

    setState('running')
    setError(null)
    setChecks(placeholderChecks(definitions).map((check) => ({ ...check, status: 'running', message: 'Running…' })))

    try {
      const media = await runMediaChecks()
      const fullReport = await runSystemChecks(media)

      setReport(fullReport)
      setChecks(fullReport.checks)
      setState('done')

      if (fullReport.passed) {
        savePassedSession(fullReport)
      }

      void submitSystemCheckAudit(fullReport)

      return fullReport
    } catch (err) {
      const message = err instanceof Error ? err.message : 'System checks failed'
      setError(message)
      setState('error')
      return null
    }
  }, [definitions, desktopAvailable])

  return {
    definitions,
    checks,
    report,
    state,
    error,
    desktopAvailable,
    runChecks,
    hasPassed: Boolean(report?.passed),
  }
}
