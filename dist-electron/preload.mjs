"use strict";
const electron = require("electron");
const IPC = {
  RUN_ALL: "system-checks:run-all",
  GET_DEFINITIONS: "system-checks:get-definitions"
};
const PROCTORING_IPC = {
  START_LOCKDOWN: "proctoring:start-lockdown",
  END_LOCKDOWN: "proctoring:end-lockdown",
  LIST_RUNNING_APPS: "proctoring:list-running-apps",
  CLOSE_RUNNING_APPS: "proctoring:close-running-apps",
  CAPTURE_EXAM_SCREEN: "proctoring:capture-exam-screen",
  EVENT: "proctoring:event"
};
electron.contextBridge.exposeInMainWorld("systemChecks", {
  isAvailable: () => true,
  getDefinitions: () => electron.ipcRenderer.invoke(IPC.GET_DEFINITIONS),
  runAll: (media) => electron.ipcRenderer.invoke(IPC.RUN_ALL, media)
});
electron.contextBridge.exposeInMainWorld("proctoring", {
  listRunningApps: () => electron.ipcRenderer.invoke(PROCTORING_IPC.LIST_RUNNING_APPS),
  closeRunningApps: (pids) => electron.ipcRenderer.invoke(PROCTORING_IPC.CLOSE_RUNNING_APPS, pids),
  startLockdown: () => electron.ipcRenderer.invoke(PROCTORING_IPC.START_LOCKDOWN),
  endLockdown: () => electron.ipcRenderer.invoke(PROCTORING_IPC.END_LOCKDOWN),
  captureExamScreen: () => electron.ipcRenderer.invoke(PROCTORING_IPC.CAPTURE_EXAM_SCREEN),
  onEvent: (listener) => {
    const wrapped = (_event, payload) => listener(payload);
    electron.ipcRenderer.on(PROCTORING_IPC.EVENT, wrapped);
    return () => electron.ipcRenderer.off(PROCTORING_IPC.EVENT, wrapped);
  }
});
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(
      channel,
      (event, ...args2) => listener(event, ...args2)
    );
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
});
