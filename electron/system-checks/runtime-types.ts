export type DetectedApp = {
  pid: number
  processName: string
  displayName: string
  path?: string
  iconDataUrl?: string
}

export type CloseAppsResult = {
  closed: DetectedApp[]
  kept: DetectedApp[]
  failed: Array<DetectedApp & { error: string }>
}

export type LockdownEvent =
  | { type: 'blur'; at: string }
  | { type: 'focus'; at: string }
  | { type: 'minimize'; at: string }
  | { type: 'restore'; at: string }
  | { type: 'display-changed'; at: string; displayCount: number }
  | { type: 'app-switched'; at: string; appName: string }
  | { type: 'navigation-blocked'; at: string; url: string }
  | { type: 'shortcut-blocked'; at: string; accelerator: string }

export type LockdownStatus = {
  active: boolean
  fullscreen: boolean
  focused: boolean
  minimized: boolean
  displayCount: number
}
