/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string;
    /** /dist/ or /public/ */
    VITE_PUBLIC: string;
  }
}

// The preload bridges (`systemChecks`, `proctoring`, `examLauncher`) are declared once in
// src/vite-env.d.ts against their own `*/types.ts` contracts. They used to be re-declared here as
// inline shapes, which silently drifted — captureExamScreen existed in the preload and in
// ProctoringApi but not in the copy, so every call site failed to typecheck.
interface Window {
  ipcRenderer: import("electron").IpcRenderer;
}
