/** Mirrors electron/deep-link/types.ts — the `upgradexam://launch?…` handoff from the LMS. */
export type DeepLinkPayload = {
  action: string
  code: string | null
  examId: string | null
}

/** Exposed by preload as `window.examLauncher`; absent when the renderer runs outside Electron. */
export type ExamLauncherApi = {
  isAvailable: () => boolean
  /** Subscribes to deep links. Returns an unsubscribe function. */
  onDeepLink: (listener: (payload: DeepLinkPayload) => void) => () => void
}
