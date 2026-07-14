import type { CloseAppsResult, LockdownState, ProctorEvent, RunningApp } from "./types"

function getBridge() {
  return window.proctoring
}

export async function listRunningApps(): Promise<RunningApp[]> {
  const bridge = getBridge()
  if (!bridge) return []
  return bridge.listRunningApps()
}

export async function closeRunningApps(pids: number[]): Promise<CloseAppsResult> {
  const bridge = getBridge()
  if (!bridge) return { closed: [], skipped: [], failed: [] }
  return bridge.closeRunningApps(pids)
}

export async function startLockdown(): Promise<LockdownState> {
  const bridge = getBridge()
  if (!bridge) return { active: false }
  return bridge.startLockdown()
}

export async function endLockdown(): Promise<LockdownState> {
  const bridge = getBridge()
  if (!bridge) return { active: false }
  return bridge.endLockdown()
}

export function subscribeProctorEvents(listener: (event: ProctorEvent) => void) {
  return getBridge()?.onEvent(listener) ?? (() => undefined)
}


export async function captureExamScreen(): Promise<string | null> {
  const bridge = getBridge()
  if (!bridge?.captureExamScreen) return null
  return bridge.captureExamScreen()
}
