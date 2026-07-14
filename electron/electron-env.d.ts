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

interface Window {
  ipcRenderer: import("electron").IpcRenderer;
  systemChecks: {
    getDefinitions: () => Promise<
      import("../src/lib/system-checks/types").CheckDefinition[]
    >;
    runAll: (
      media?: import("../src/lib/system-checks/types").MediaCheckInput,
    ) => Promise<import("../src/lib/system-checks/types").SystemCheckReport>;
    isAvailable: () => boolean;
  };
  proctoring: {
    listRunningApps: () => Promise<
      import("../src/lib/proctoring/types").RunningApp[]
    >;
    closeRunningApps: (
      pids: number[],
    ) => Promise<import("../src/lib/proctoring/types").CloseAppsResult>;
    startLockdown: () => Promise<
      import("../src/lib/proctoring/types").LockdownState
    >;
    endLockdown: () => Promise<
      import("../src/lib/proctoring/types").LockdownState
    >;
    onEvent: (
      listener: (
        event: import("../src/lib/proctoring/types").ProctorEvent,
      ) => void,
    ) => () => void;
  };
}
