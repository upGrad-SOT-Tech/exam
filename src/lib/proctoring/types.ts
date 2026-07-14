export type RunningApp = {
  pid: number
  processName: string
  displayName: string
  path?: string
  iconDataUrl?: string
  allowed?: boolean
  allowReason?: string
}

export type CloseAppsResult = {
  closed: number[]
  skipped: RunningApp[]
  failed: Array<{ pid: number; displayName: string; reason: string }>
}

export type ProctorEventType =
  | "focus_lost"
  | "focus_restored"
  | "window_minimized"
  | "display_changed"
  | "navigation_blocked"
  | "new_window_blocked"
  | "shortcut_blocked"
  | "download_blocked"
  | "network_lost"
  | "media_device_changed"
  | "battery_critical"
  | "copy_blocked"
  | "paste_blocked"
  | "cut_blocked"
  | "select_blocked"
  | "drag_blocked"
  | "visibility_hidden"
  | "visibility_visible"
  | "page_hidden"
  | "page_shown"
  | "laptop_suspend"
  | "laptop_resume"
  | "screen_locked"
  | "screen_unlocked"
  | "another_app_active"
  | "screen_capture_attempted"
  | "screen_recording_detected"
  | "proctor_webcam_failed"
  | "proctor_screenshot_failed"
  | "no_face"
  | "multi_face"
  | "phone_detected"
  | "book_detected"
  | "gaze_off_screen"
  | "head_pose_anomaly"
  | "eyes_closed"

export type ProctorEvent = {
  type: ProctorEventType
  occurredAt: string
  details?: Record<string, unknown>
}

export type LockdownState = {
  active: boolean
}

export type ProctoringApi = {
  listRunningApps: () => Promise<RunningApp[]>
  closeRunningApps: (pids: number[]) => Promise<CloseAppsResult>
  startLockdown: () => Promise<LockdownState>
  endLockdown: () => Promise<LockdownState>
  captureExamScreen: () => Promise<string | null>
  onEvent: (listener: (event: ProctorEvent) => void) => () => void
}
