import { ipcRenderer, contextBridge } from "electron";
import type { MediaCheckInput } from "./system-checks/types";
import { IPC } from "./system-checks/ipc-channels";
import { PROCTORING_IPC } from "./proctoring/ipc-channels";
import type { ProctorEvent } from "./proctoring/types";
import { DEEP_LINK_IPC } from "./deep-link/ipc-channels";
import type { DeepLinkPayload } from "./deep-link/types";

contextBridge.exposeInMainWorld("systemChecks", {
  isAvailable: () => true,
  getDefinitions: () => ipcRenderer.invoke(IPC.GET_DEFINITIONS),
  runAll: (media?: MediaCheckInput) => ipcRenderer.invoke(IPC.RUN_ALL, media),
  clearClipboard: () => ipcRenderer.invoke(IPC.CLEAR_CLIPBOARD),
});

contextBridge.exposeInMainWorld("proctoring", {
  listRunningApps: () => ipcRenderer.invoke(PROCTORING_IPC.LIST_RUNNING_APPS),
  closeRunningApps: (pids: number[]) =>
    ipcRenderer.invoke(PROCTORING_IPC.CLOSE_RUNNING_APPS, pids),
  startLockdown: () => ipcRenderer.invoke(PROCTORING_IPC.START_LOCKDOWN),
  endLockdown: () => ipcRenderer.invoke(PROCTORING_IPC.END_LOCKDOWN),
  captureExamScreen: () => ipcRenderer.invoke(PROCTORING_IPC.CAPTURE_EXAM_SCREEN),
  onEvent: (listener: (event: ProctorEvent) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: ProctorEvent) =>
      listener(payload);
    ipcRenderer.on(PROCTORING_IPC.EVENT, wrapped);
    return () => ipcRenderer.off(PROCTORING_IPC.EVENT, wrapped);
  },
});

// SSO handoff from the LMS: `upgradexam://launch?code=…&examId=…`. The renderer subscribes at
// startup and trades the code for a session, so the student never signs in twice.
contextBridge.exposeInMainWorld("examLauncher", {
  isAvailable: () => true,
  onDeepLink: (listener: (payload: DeepLinkPayload) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: DeepLinkPayload) =>
      listener(payload);
    ipcRenderer.on(DEEP_LINK_IPC.EVENT, wrapped);
    return () => ipcRenderer.off(DEEP_LINK_IPC.EVENT, wrapped);
  },
});

contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args),
    );
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },
});
