export const DEEP_LINK_IPC = {
  EVENT: "deep-link:event",
} as const

// The custom URL scheme this app claims with the OS. Must match the LMS's EXAM_DESKTOP_SCHEME and
// electron-builder's `protocols` entry — all three name the same scheme.
export const DEEP_LINK_SCHEME = "upgradexam"
