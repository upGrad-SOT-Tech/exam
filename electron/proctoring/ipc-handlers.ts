import { BrowserWindow, app, globalShortcut, ipcMain, powerMonitor, screen, session, shell } from "electron"
import { clearSystemClipboard } from "../system-checks/clipboard"
import si from "systeminformation"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { PROCTORING_IPC } from "./ipc-channels"
import type { CloseAppsResult, ProctorEvent, RunningApp } from "./types"
import { resolveDetectedApps } from "../system-checks/services/process-apps.service"
import {
  ANYDESK_PROCESSES,
  OBS_PROCESSES,
  REMOTE_DESKTOP_PROCESSES,
  SCREEN_RECORDING_PROCESSES,
  TEAMVIEWER_PROCESSES,
} from "../system-checks/constants"
import { matchProcessList } from "../system-checks/utils"

let lockedWindow: BrowserWindow | null = null
let lockdownActive = false
let minimizeHandler: (() => void) | null = null
let fullScreenHandler: (() => void) | null = null
let activeAppTimer: NodeJS.Timeout | null = null
let focusWatchdogTimer: NodeJS.Timeout | null = null
let prohibitedProcessTimer: NodeJS.Timeout | null = null
let clipboardGuardTimer: NodeJS.Timeout | null = null
let lastFrontmostApp = ""
let lastProhibitedEmitKey = ""
let shortcutRegistered = false
let displayMediaHandlerInstalled = false
let permissionHandlerInstalled = false

const execFileAsync = promisify(execFile)
// Screen-capture permissions to refuse during lockdown. Compared as plain strings: Electron's
// permission union only names "display-capture", but older builds ask with "desktopCapturer", and
// a request we don't recognise must still be blocked rather than silently type-checked away.
const CAPTURE_PERMISSIONS = new Set(["display-capture", "desktopCapturer"])
const developmentAllowedAppNames = ["cursor", "electron", "electron-vite-project", "node"]
const prohibitedPatterns = [
  ...REMOTE_DESKTOP_PROCESSES,
  ...SCREEN_RECORDING_PROCESSES,
  ...OBS_PROCESSES,
  ...TEAMVIEWER_PROCESSES,
  ...ANYDESK_PROCESSES,
]
const systemGuiNames = [
  "Finder",
  "Dock",
  "ControlCenter",
  "Spotlight",
  "NotificationCenter",
  "WindowManager",
  "SystemUIServer",
  "loginwindow",
  "WallpaperAgent",
  "TextInputSwitcher",
]

function emitEvent(type: ProctorEvent["type"], details?: Record<string, unknown>) {
  if (!lockedWindow || lockedWindow.isDestroyed()) return
  lockedWindow.webContents.send(PROCTORING_IPC.EVENT, {
    type,
    occurredAt: new Date().toISOString(),
    details,
  } satisfies ProctorEvent)
}

function ensureLockdownPresentation(win: BrowserWindow) {
  if (win.isDestroyed()) return

  if (!win.isKiosk()) win.setKiosk(true)

  win.setAlwaysOnTop(true, "screen-saver")
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
}

function forceExamWindowToFront(reapplyPresentation = false) {
  const win = lockedWindow
  if (!win || win.isDestroyed()) return

  try {
    app.focus({ steal: true })
  } catch {
  }

  if (win.isMinimized()) win.restore()
  if (reapplyPresentation) ensureLockdownPresentation(win)

  win.setAlwaysOnTop(true, "screen-saver")
  win.show()
  win.moveTop()
  win.focus()
}

type FrontmostApp = {
  name: string
  pid: number
  bundleIdentifier?: string
}

function isExamFrontmostApp(frontmost: FrontmostApp) {
  if (frontmost.pid === process.pid) return true
  const normalized = `${frontmost.name} ${frontmost.bundleIdentifier ?? ""}`.toLowerCase()
  return normalized.includes(app.getName().toLowerCase())
}

async function getFrontmostApp(): Promise<FrontmostApp | null> {
  if (process.platform !== "darwin") return null

  const script = `
const systemEvents = Application('System Events');
const app = systemEvents.applicationProcesses.whose({ frontmost: true })()[0];
app ? JSON.stringify({ name: app.name(), pid: app.unixId(), bundleIdentifier: app.bundleIdentifier() }) : '';
`
  try {
    const { stdout } = await execFileAsync("osascript", ["-l", "JavaScript", "-e", script], {
      timeout: 1000,
    })
    const raw = stdout.trim()
    if (!raw) return null
    const parsed = JSON.parse(raw) as FrontmostApp
    return parsed.name ? parsed : null
  } catch {
    return null
  }
}

function registerLockdownShortcuts() {
  if (shortcutRegistered) return
  const shortcuts = [
    "CommandOrControl+Tab",
    "CommandOrControl+Shift+Tab",
    "CommandOrControl+`",
    "CommandOrControl+Q",
    "CommandOrControl+H",
    "CommandOrControl+M",
    "CommandOrControl+C",
    "CommandOrControl+V",
    "CommandOrControl+X",
    "CommandOrControl+A",
    "CommandOrControl+P",
    "CommandOrControl+S",
    "Alt+Tab",
    "Alt+Shift+Tab",
    "Control+Left",
    "Control+Right",
    "Control+Up",
    "Control+Down",
    "CommandOrControl+Left",
    "CommandOrControl+Right",
    // macOS Screenshot / Screen Recording UI (best-effort; OS may retain some)
    "CommandOrControl+Shift+3",
    "CommandOrControl+Shift+4",
    "CommandOrControl+Shift+5",
    "CommandOrControl+Shift+6",
  ]

  for (const shortcut of shortcuts) {
    const ok = globalShortcut.register(shortcut, () => {
      const isCapture =
        shortcut.includes("Shift+3") ||
        shortcut.includes("Shift+4") ||
        shortcut.includes("Shift+5") ||
        shortcut.includes("Shift+6")
      emitEvent(isCapture ? "screen_capture_attempted" : "shortcut_blocked", {
        key: shortcut,
        global: true,
        blocked: true,
      })
      forceExamWindowToFront(true)
      sanitizeClipboard()
    })
    if (!ok && (shortcut.includes("Shift+3") || shortcut.includes("Shift+4") || shortcut.includes("Shift+5"))) {
      // OS reserved — rely on process monitor + content protection.
    }
  }

  shortcutRegistered = true
}

function unregisterLockdownShortcuts() {
  if (!shortcutRegistered) return
  globalShortcut.unregisterAll()
  shortcutRegistered = false
}

function startActiveAppMonitor() {
  if (activeAppTimer) return
  lastFrontmostApp = ""
  activeAppTimer = setInterval(() => {
    if (!lockdownActive) return
    void getFrontmostApp().then((frontmost) => {
      if (!frontmost || isExamFrontmostApp(frontmost)) return
      const appKey = `${frontmost.name}:${frontmost.pid}`
      if (appKey !== lastFrontmostApp) {
        lastFrontmostApp = appKey
        emitEvent("another_app_active", {
          appName: frontmost.name,
          pid: frontmost.pid,
          bundleIdentifier: frontmost.bundleIdentifier,
        })
      }
      forceExamWindowToFront(true)
    })
  }, 150)
}

function stopActiveAppMonitor() {
  if (!activeAppTimer) return
  clearInterval(activeAppTimer)
  activeAppTimer = null
  lastFrontmostApp = ""
}

function startFocusWatchdog() {
  if (focusWatchdogTimer) return
  focusWatchdogTimer = setInterval(() => {
    const win = lockedWindow
    if (!lockdownActive || !win || win.isDestroyed()) return
    if (win.isFocused() && win.isVisible() && !win.isMinimized()) return

    emitEvent("focus_lost", { reason: "lockdown_watchdog" })
    forceExamWindowToFront(true)
  }, 250)
}

function stopFocusWatchdog() {
  if (!focusWatchdogTimer) return
  clearInterval(focusWatchdogTimer)
  focusWatchdogTimer = null
}

function sanitizeClipboard() {
  clearSystemClipboard()
}

function startClipboardGuard() {
  if (clipboardGuardTimer) return
  sanitizeClipboard()
  clipboardGuardTimer = setInterval(() => {
    if (!lockdownActive) return
    sanitizeClipboard()
  }, 1_200)
}

function stopClipboardGuard() {
  if (!clipboardGuardTimer) return
  clearInterval(clipboardGuardTimer)
  clipboardGuardTimer = null
}

function matchProhibitedName(name: string) {
  const lower = name.toLowerCase()
  return prohibitedPatterns.some((pattern) => lower.includes(pattern.toLowerCase()))
}

async function findProhibitedRecordingApps(): Promise<Array<{ pid: number; name: string }>> {
  try {
    const processes = await si.processes()
    return processes.list
      .filter((item) => typeof item.name === "string" && matchProhibitedName(item.name))
      .filter((item) => item.pid !== process.pid)
      .map((item) => ({ pid: item.pid, name: item.name }))
  } catch {
    return []
  }
}

function startProhibitedProcessMonitor() {
  if (prohibitedProcessTimer) return
  prohibitedProcessTimer = setInterval(() => {
    if (!lockdownActive) return
    void findProhibitedRecordingApps().then((apps) => {
      if (apps.length === 0) {
        lastProhibitedEmitKey = ""
        return
      }

      const key = apps.map((item) => `${item.name}:${item.pid}`).sort().join("|")
      if (key !== lastProhibitedEmitKey) {
        lastProhibitedEmitKey = key
        emitEvent("screen_recording_detected", {
          apps: apps.slice(0, 12),
          count: apps.length,
        })
      }

      for (const appInfo of apps) {
        try {
          process.kill(appInfo.pid)
        } catch {
        }
      }
      forceExamWindowToFront(true)
    })
  }, 1_800)
}

function stopProhibitedProcessMonitor() {
  if (!prohibitedProcessTimer) return
  clearInterval(prohibitedProcessTimer)
  prohibitedProcessTimer = null
  lastProhibitedEmitKey = ""
}

function installCaptureGuards() {
  try {
    if (!displayMediaHandlerInstalled) {
      session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
        if (lockdownActive) {
          emitEvent("screen_capture_attempted", { source: "display_media_api", blocked: true })
          callback({})
          return
        }
        callback({})
      })
      displayMediaHandlerInstalled = true
    }
  } catch {
    // Older Electron builds may not expose this API.
  }

  try {
    if (!permissionHandlerInstalled) {
      session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
        if (!lockdownActive) {
          callback(true)
          return
        }
        if (permission === "media") {
          callback(true)
          return
        }
        if (CAPTURE_PERMISSIONS.has(String(permission))) {
          emitEvent("screen_capture_attempted", { source: permission, blocked: true })
          callback(false)
          return
        }
        callback(false)
      })
      permissionHandlerInstalled = true
    }
  } catch {
  }
}

function isBlockedShortcut(input: Electron.Input) {
  const key = input.key.toLowerCase()
  const meta = input.meta || input.control
  const shift = input.shift

  // Cmd/Ctrl+Shift+3/4/5/6 — screenshot / recording UI
  if (meta && shift && ["3", "4", "5", "6"].includes(key)) return true

  if (!meta) return false
  return [
    "a",
    "c",
    "v",
    "x",
    "r",
    "l",
    "w",
    "p",
    "s",
    "o",
    "n",
    "t",
    "[",
    "]",
    "arrowleft",
    "arrowright",
    "arrowup",
    "arrowdown",
    "left",
    "right",
    "up",
    "down",
  ].includes(key)
}

function applyWindowPolicy(win: BrowserWindow) {
  installCaptureGuards()
  win.setResizable(false)
  win.setMaximizable(false)
  win.setMinimizable(false)
  // Content protection: other apps' screen records/screenshots of THIS window should be black/blank.
  win.setContentProtection(true)
  win.webContents.closeDevTools()
  ensureLockdownPresentation(win)
  forceExamWindowToFront(true)
  registerLockdownShortcuts()
  minimizeHandler = () => {
    emitEvent("window_minimized")
    forceExamWindowToFront(true)
  }
  fullScreenHandler = () => {
    if (!lockdownActive || win.isDestroyed()) return
    ensureLockdownPresentation(win)
    forceExamWindowToFront(true)
  }
  win.on("minimize", minimizeHandler)
  win.on("leave-full-screen", fullScreenHandler)
  startActiveAppMonitor()
  startFocusWatchdog()
  startProhibitedProcessMonitor()
  startClipboardGuard()
}

function releaseWindowPolicy(win: BrowserWindow) {
  stopActiveAppMonitor()
  stopFocusWatchdog()
  stopProhibitedProcessMonitor()
  stopClipboardGuard()
  unregisterLockdownShortcuts()
  if (minimizeHandler) {
    win.off("minimize", minimizeHandler)
    minimizeHandler = null
  }
  if (fullScreenHandler) {
    win.off("leave-full-screen", fullScreenHandler)
    fullScreenHandler = null
  }
  win.setAlwaysOnTop(false)
  win.setVisibleOnAllWorkspaces(false)
  win.setContentProtection(false)
  if (win.isKiosk()) win.setKiosk(false)
  win.setResizable(true)
  win.setMaximizable(true)
  win.setMinimizable(true)
}

function isAllowedApp(appInfo: RunningApp) {
  const label = `${appInfo.displayName} ${appInfo.processName} ${appInfo.path ?? ""}`.toLowerCase()
  if (appInfo.pid === process.pid) return "Exam application"
  if (app.isPackaged) return null
  const allowed = developmentAllowedAppNames.find((name) => label.includes(name))
  return allowed ? `Allowed for local testing: ${allowed}` : null
}

function isSystemGuiApp(appInfo: RunningApp) {
  if (systemGuiNames.includes(appInfo.displayName) || systemGuiNames.includes(appInfo.processName)) return true
  const appPath = appInfo.path ?? ""
  return appPath.startsWith("/System/Library/") || appPath.includes("/System/Library/CoreServices/")
}

async function getMacGuiProcessIds(): Promise<Set<number>> {
  const script = `
const systemEvents = Application('System Events');
const apps = systemEvents.applicationProcesses.whose({ backgroundOnly: false })();
JSON.stringify(apps.map((item) => ({ pid: item.unixId(), name: item.name() })));
`
  try {
    const { stdout } = await execFileAsync("osascript", ["-l", "JavaScript", "-e", script], {
      timeout: 3000,
    })
    const parsed = JSON.parse(stdout.trim()) as Array<{ pid?: number }>
    return new Set(parsed.map((item) => item.pid).filter((pid): pid is number => typeof pid === "number"))
  } catch {
    return new Set()
  }
}

async function listRunningApps(): Promise<RunningApp[]> {
  const processes = await si.processes()
  const guiPids = process.platform === "darwin" ? await getMacGuiProcessIds() : new Set<number>()
  const processItems = processes.list
    .filter((item) => typeof item.name === "string" && item.name.trim().length > 0)
  const refs = processItems
    .filter((item) => {
      if (item.pid === process.pid) return false
      if (guiPids.has(item.pid)) return true
      return prohibitedPatterns.some((pattern) => matchProcessList(item.name, [pattern]))
    })
    .map((item) => ({
      name: item.name,
      pid: item.pid,
      path: typeof item.path === "string" ? item.path : undefined,
    }))

  const apps = await resolveDetectedApps(refs)
  const runningApps: RunningApp[] = apps.map((item) => {
      const allowReason = isAllowedApp(item)
      return allowReason ? { ...item, allowed: true, allowReason } : item
    })

  return runningApps
    .filter((item) => item.allowed || !isSystemGuiApp(item))
    .sort((a, b) => Number(Boolean(a.allowed)) - Number(Boolean(b.allowed)) || a.displayName.localeCompare(b.displayName))
}

async function closeRunningApps(pids: number[]): Promise<CloseAppsResult> {
  const uniquePids = [...new Set(pids.filter((pid) => Number.isInteger(pid) && pid > 0))]
  const listedApps = await listRunningApps()
  const byPid = new Map(listedApps.map((item) => [item.pid, item]))

  let processByPid = new Map<number, { name?: string; path?: string }>()
  try {
    const processes = await si.processes()
    processByPid = new Map(
      processes.list.map((item) => [
        item.pid,
        {
          name: typeof item.name === "string" ? item.name : undefined,
          path: typeof item.path === "string" ? item.path : undefined,
        },
      ]),
    )
  } catch {
    // Fall back to listed apps only for display names.
  }

  const closed: number[] = []
  const skipped: RunningApp[] = []
  const failed: CloseAppsResult["failed"] = []

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  for (const pid of uniquePids) {
    const listed = byPid.get(pid)
    if (listed?.allowed) {
      skipped.push(listed)
      continue
    }

    const raw = processByPid.get(pid)
    const displayName =
      listed?.displayName ||
      raw?.name ||
      `Process ${pid}`

    // Never kill our own exam process.
    if (pid === process.pid) {
      skipped.push(
        listed || {
          pid,
          processName: displayName,
          displayName,
          allowed: true,
          allowReason: "Exam application",
        },
      )
      continue
    }

    try {
      process.kill(pid, "SIGTERM")
      await sleep(350)
      try {
        process.kill(pid, 0)
        process.kill(pid, "SIGKILL")
      } catch {
        // Already exited after SIGTERM.
      }
      closed.push(pid)
    } catch (err) {
      failed.push({
        pid,
        displayName,
        reason: err instanceof Error ? err.message : "Unable to close process",
      })
    }
  }

  return { closed, skipped, failed }
}

export function registerProctoringHandlers(winProvider: () => BrowserWindow | null): void {
  ipcMain.handle(PROCTORING_IPC.LIST_RUNNING_APPS, async () => listRunningApps())
  ipcMain.handle(PROCTORING_IPC.CLOSE_RUNNING_APPS, async (_event, pids: number[]) =>
    closeRunningApps(Array.isArray(pids) ? pids : []),
  )

  ipcMain.handle(PROCTORING_IPC.START_LOCKDOWN, async () => {
    const win = winProvider()
    if (!win) return { active: false }

    lockedWindow = win
    lockdownActive = true
    applyWindowPolicy(win)
    await new Promise((resolve) => setTimeout(resolve, 150))

    if (!win.isDestroyed() && !win.isKiosk()) {
      ensureLockdownPresentation(win)
      forceExamWindowToFront()
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    return { active: !win.isDestroyed() && win.isKiosk() }
  })

  ipcMain.handle(PROCTORING_IPC.END_LOCKDOWN, () => {
    const win = lockedWindow
    lockdownActive = false
    lockedWindow = null
    if (win && !win.isDestroyed()) releaseWindowPolicy(win)
    return { active: false }
  })

  ipcMain.handle(PROCTORING_IPC.CAPTURE_EXAM_SCREEN, async () => {
    const win = lockedWindow && !lockedWindow.isDestroyed() ? lockedWindow : winProvider()
    if (!win || win.isDestroyed()) return null
    try {
      const image = await win.webContents.capturePage()
      if (image.isEmpty()) return null
      return image.toJPEG(78).toString("base64")
    } catch {
      return null
    }
  })

  app.on("browser-window-focus", (_event, win) => {
    if (lockdownActive && win === lockedWindow) emitEvent("focus_restored")
  })

  app.on("browser-window-blur", (_event, win) => {
    if (lockdownActive && win === lockedWindow) {
      emitEvent("focus_lost")
      forceExamWindowToFront(true)
    }
  })

  screen.on("display-added", (_event, display) => {
    if (lockdownActive) emitEvent("display_changed", { action: "added", id: display.id })
  })

  screen.on("display-removed", (_event, display) => {
    if (lockdownActive) emitEvent("display_changed", { action: "removed", id: display.id })
  })

  session.defaultSession.on("will-download", (event) => {
    if (!lockdownActive) return
    event.preventDefault()
    emitEvent("download_blocked")
  })

  powerMonitor.on("suspend", () => {
    if (lockdownActive) emitEvent("laptop_suspend")
  })

  powerMonitor.on("resume", () => {
    if (lockdownActive) emitEvent("laptop_resume")
  })

  powerMonitor.on("lock-screen", () => {
    if (lockdownActive) emitEvent("screen_locked")
  })

  powerMonitor.on("unlock-screen", () => {
    if (lockdownActive) emitEvent("screen_unlocked")
  })

  app.on("web-contents-created", (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (lockdownActive) {
        emitEvent("new_window_blocked", { url })
        return { action: "deny" }
      }
      void shell.openExternal(url)
      return { action: "deny" }
    })

    contents.on("will-navigate", (event, url) => {
      if (!lockdownActive) return
      event.preventDefault()
      emitEvent("navigation_blocked", { url })
    })

    contents.on("context-menu", (event) => {
      if (lockdownActive) event.preventDefault()
    })

    contents.on("before-input-event", (event, input) => {
      if (!lockdownActive || !isBlockedShortcut(input)) return
      event.preventDefault()
      const key = input.key.toLowerCase()
      const isCapture =
        (input.meta || input.control) &&
        input.shift &&
        ["3", "4", "5", "6"].includes(key)
      emitEvent(isCapture ? "screen_capture_attempted" : "shortcut_blocked", {
        key: input.key,
        meta: input.meta,
        control: input.control,
        shift: input.shift,
      })
      if (isCapture) sanitizeClipboard()
      forceExamWindowToFront(true)
    })
  })
}
