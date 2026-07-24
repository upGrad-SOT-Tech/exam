import { app, BrowserWindow } from "electron"
import path from "node:path"
import { DEEP_LINK_IPC, DEEP_LINK_SCHEME } from "./ipc-channels"
import type { DeepLinkPayload } from "./types"

/**
 * `upgradexam://launch?code=…&examId=…` — the LMS hands a student off to this app.
 *
 * The student clicks their scheduled exam in the LMS web app; the LMS mints a one-time code and
 * asks the OS to open this URL. We capture the code and forward it to the renderer, which trades it
 * for a session (POST /api/auth/sso/exchange) and lands on the exam — no second sign-in.
 *
 * Three arrival paths, all of which have to work:
 *  - macOS, running or cold: the `open-url` event.
 *  - Windows/Linux, already running: `second-instance`, with the URL in the new process's argv.
 *  - Windows/Linux, cold start: the URL is already in our own `process.argv`.
 * A link that arrives before the window can receive it is parked in `pendingDeepLink` and replayed
 * from did-finish-load, otherwise every cold-start launch would be silently dropped.
 */

let pendingDeepLink: DeepLinkPayload | null = null

function parseDeepLink(rawUrl: string): DeepLinkPayload | null {
  if (!rawUrl?.startsWith(`${DEEP_LINK_SCHEME}://`)) return null
  try {
    const url = new URL(rawUrl)
    return {
      action: url.hostname || "launch",
      code: url.searchParams.get("code"),
      examId: url.searchParams.get("examId"),
    }
  } catch {
    return null
  }
}

function firstDeepLinkIn(argv: string[]): string | null {
  return argv.find((arg) => arg.startsWith(`${DEEP_LINK_SCHEME}://`)) ?? null
}

function deliver(payload: DeepLinkPayload | null, getWindow: () => BrowserWindow | null) {
  if (!payload) return
  const win = getWindow()
  if (!win || win.webContents.isLoading()) {
    pendingDeepLink = payload
    return
  }
  if (win.isMinimized()) win.restore()
  win.focus()
  win.webContents.send(DEEP_LINK_IPC.EVENT, payload)
}

/** Replays a link that arrived before the renderer was ready. Call once the window has loaded. */
export function flushPendingDeepLink(win: BrowserWindow | null) {
  if (!pendingDeepLink || !win) return
  const payload = pendingDeepLink
  pendingDeepLink = null
  win.webContents.send(DEEP_LINK_IPC.EVENT, payload)
}

/**
 * Claims the scheme with the OS and wires every arrival path. Returns false when another instance
 * already holds the single-instance lock — the caller must quit immediately in that case, having
 * already handed its argv to the running instance through `second-instance`.
 */
export function registerDeepLinks(getWindow: () => BrowserWindow | null): boolean {
  if (process.platform === "darwin") {
    // macOS binds a URL scheme to a bundle through its Info.plist (CFBundleURLTypes) at install
    // time; the path/args form below is ignored here. A runtime call from the *unpackaged* dev
    // binary would only point upgradexam:// at the generic com.github.electron bundle that is
    // actually running — hijacking the scheme away from the installed app and breaking every LMS
    // launch. So on macOS we only (re)assert ownership when packaged; in dev the link is exercised
    // through an installed/packaged build, whose Info.plist already claims the scheme.
    if (app.isPackaged) app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME)
  } else if (process.defaultApp && process.argv.length >= 2) {
    // `electron .` in development on Windows/Linux: the OS needs the interpreter *and* the app path
    // to relaunch us, otherwise the scheme would register against the bare electron binary.
    app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME, process.execPath, [path.resolve(process.argv[1])])
  } else {
    app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME)
  }

  // A second copy must never open during a proctored exam — hand its URL to the live instance.
  if (!app.requestSingleInstanceLock()) return false

  app.on("second-instance", (_event, argv) => {
    deliver(parseDeepLink(firstDeepLinkIn(argv) ?? ""), getWindow)
  })

  app.on("open-url", (event, url) => {
    event.preventDefault()
    deliver(parseDeepLink(url), getWindow)
  })

  const initial = parseDeepLink(firstDeepLinkIn(process.argv) ?? "")
  if (initial) pendingDeepLink = initial

  return true
}
