import { ipcMain } from "electron";
import { IPC } from "./ipc-channels";
import { getCheckDefinitions, runNativeChecks } from "./orchestrator";
import type { MediaCheckInput } from "./types";

export function registerSystemCheckHandlers(): void {
  ipcMain.handle(IPC.GET_DEFINITIONS, () => getCheckDefinitions());

  ipcMain.handle(IPC.RUN_ALL, async (_event, media?: MediaCheckInput) => {
    return runNativeChecks(media);
  });
}
