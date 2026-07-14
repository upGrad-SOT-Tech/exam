import type { CheckDefinition, CheckResult } from '../types'
import {
  ANYDESK_PROCESSES,
  OBS_PROCESSES,
  REMOTE_DESKTOP_PROCESSES,
  SCREEN_RECORDING_PROCESSES,
  TEAMVIEWER_PROCESSES,
} from '../constants'
import type { SystemSnapshot } from '../snapshot'
import { createResult, matchProcessList } from '../utils'

type ProcessMatch = { name: string; pid: number; path?: string }

function findMatchingProcesses(snapshot: SystemSnapshot, patterns: string[]): ProcessMatch[] {
  return snapshot.processes.list
    .filter((process) => matchProcessList(process.name, patterns))
    .map((process) => ({
      name: process.name,
      pid: process.pid,
      path: typeof process.path === 'string' ? process.path : undefined,
    }))
}

function collectProcessCheck(
  definition: CheckDefinition,
  snapshot: SystemSnapshot,
  patterns: string[],
  passMessage: string,
  failMessage: (matches: ProcessMatch[]) => string,
): CheckResult {
  const startedAt = Date.now()
  const matches = findMatchingProcesses(snapshot, patterns)

  if (matches.length === 0) {
    return createResult(definition, 'passed', passMessage, startedAt)
  }

  return createResult(definition, 'failed', failMessage(matches), startedAt, { processes: matches })
}

export function collectObs(definition: CheckDefinition, snapshot: SystemSnapshot): CheckResult {
  return collectProcessCheck(
    definition,
    snapshot,
    OBS_PROCESSES,
    'OBS not running',
    (matches) => `OBS detected: ${matches.map((m) => m.name).join(', ')}`,
  )
}

export function collectTeamViewer(definition: CheckDefinition, snapshot: SystemSnapshot): CheckResult {
  return collectProcessCheck(
    definition,
    snapshot,
    TEAMVIEWER_PROCESSES,
    'TeamViewer not running',
    (matches) => `TeamViewer detected: ${matches.map((m) => m.name).join(', ')}`,
  )
}

export function collectAnyDesk(definition: CheckDefinition, snapshot: SystemSnapshot): CheckResult {
  return collectProcessCheck(
    definition,
    snapshot,
    ANYDESK_PROCESSES,
    'AnyDesk not running',
    (matches) => `AnyDesk detected: ${matches.map((m) => m.name).join(', ')}`,
  )
}

export function collectRemoteDesktop(definition: CheckDefinition, snapshot: SystemSnapshot): CheckResult {
  return collectProcessCheck(
    definition,
    snapshot,
    REMOTE_DESKTOP_PROCESSES,
    'No remote desktop software detected',
    (matches) => {
      const names = matches.map((match) => match.name).join(', ')
      return `Remote access software is running (${names}). Close it and re-run checks.`
    },
  )
}

export function collectScreenRecording(definition: CheckDefinition, snapshot: SystemSnapshot): CheckResult {
  return collectProcessCheck(
    definition,
    snapshot,
    SCREEN_RECORDING_PROCESSES,
    'No screen recording software detected',
    (matches) => `Screen recording software detected: ${matches.map((m) => m.name).join(', ')}`,
  )
}

export function collectRunningApplications(definition: CheckDefinition, snapshot: SystemSnapshot): CheckResult {
  const startedAt = Date.now()
  const suspicious = findMatchingProcesses(snapshot, [
    ...REMOTE_DESKTOP_PROCESSES,
    ...SCREEN_RECORDING_PROCESSES,
    ...OBS_PROCESSES,
    ...TEAMVIEWER_PROCESSES,
    ...ANYDESK_PROCESSES,
  ])

  const runningCount = snapshot.processes.running

  if (suspicious.length === 0) {
    return createResult(
      definition,
      'passed',
      `${runningCount} processes running — no flagged applications`,
      startedAt,
      { runningCount },
    )
  }

  return createResult(
    definition,
    'warning',
    `${suspicious.length} flagged application(s) running`,
    startedAt,
    { runningCount, flagged: suspicious },
  )
}
