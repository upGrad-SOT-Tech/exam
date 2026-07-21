import { app, BrowserWindow, Menu } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { registerSystemCheckHandlers } from "./system-checks/ipc-handlers";
import { registerProctoringHandlers } from "./proctoring/ipc-handlers";
import { flushPendingDeepLink, registerDeepLinks } from "./deep-link/register";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(
      process.env.VITE_PUBLIC ?? process.env.APP_ROOT,
      "electron-vite.svg",
    ),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
    // A deep link that arrived before the renderer existed (cold start from the LMS) is replayed
    // here — the window is only now able to receive it.
    flushPendingDeepLink(win);
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Claims upgradexam:// and grabs the single-instance lock. A second copy launched by the OS to
// carry a deep link forwards its argv to the running instance (see second-instance) and exits, so
// clicking "Start exam" in the LMS can never spawn a rival window mid-exam.
const isPrimaryInstance = registerDeepLinks(() => win);
if (!isPrimaryInstance) {
  app.quit();
} else {
  app.whenReady().then(() => {
    app.setName("upGrad Exam");
    Menu.setApplicationMenu(null);
    registerSystemCheckHandlers();
    registerProctoringHandlers(() => win);
    createWindow();
  });
}
