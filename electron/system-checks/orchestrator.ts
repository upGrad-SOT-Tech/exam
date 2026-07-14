import { app } from "electron";
import { CHECK_DEFINITIONS } from "./constants";
import { collectClipboard } from "./collectors/clipboard.collector";
import {
  collectMultipleMonitors,
  collectScreenResolution,
} from "./collectors/display.collector";
import {
  collectBattery,
  collectCpu,
  collectRam,
} from "./collectors/hardware.collector";
import {
  collectInternetSpeed,
  collectVpn,
} from "./collectors/network.collector";
import {
  collectAnyDesk,
  collectObs,
  collectRemoteDesktop,
  collectRunningApplications,
  collectScreenRecording,
  collectTeamViewer,
} from "./collectors/process.collector";
import { collectBrowserVersion } from "./collectors/runtime.collector";
import { collectVirtualMachine } from "./collectors/security.collector";
import { loadSystemSnapshot } from "./snapshot";
import { enrichChecksWithDetectedApps } from "./enrich-checks";
import type {
  CheckDefinition,
  CheckResult,
  MediaCheckInput,
  SystemCheckReport,
} from "./types";
import { randomRunId, withTimeout } from "./utils";

function getDefinition(id: CheckDefinition["id"]): CheckDefinition {
  const definition = CHECK_DEFINITIONS.find((item) => item.id === id);
  if (!definition) throw new Error(`Unknown check: ${id}`);
  return definition;
}

function evaluateReport(
  checks: CheckResult[],
): Pick<SystemCheckReport, "passed" | "blocked" | "summary"> {
  const failed = checks.filter((check) => check.status === "failed").length;
  const warnings = checks.filter((check) => check.status === "warning").length;
  const passed = checks.filter((check) => check.status === "passed").length;
  const blocked = checks.some(
    (check) => check.status === "failed" && check.severity === "block",
  );

  return {
    passed: !blocked,
    blocked,
    summary: { total: checks.length, passed, failed, warnings },
  };
}

export async function runNativeChecks(
  media?: MediaCheckInput,
): Promise<SystemCheckReport> {
  const startedAt = new Date().toISOString();
  const runId = randomRunId();
  const snapshot = await loadSystemSnapshot();

  const results = new Map<CheckDefinition["id"], CheckResult>();

  if (media) {
    results.set("webcam", media.webcam);
    results.set("microphone", media.microphone);
  }

  const internetSpeed = await withTimeout(
    collectInternetSpeed(getDefinition("internet_speed")),
    getDefinition("internet_speed").timeoutMs,
    "internet_speed",
  );
  results.set("internet_speed", internetSpeed);

  const nativeResults: Array<[CheckDefinition["id"], CheckResult]> = [
    [
      "screen_resolution",
      collectScreenResolution(getDefinition("screen_resolution")),
    ],
    [
      "multiple_monitors",
      collectMultipleMonitors(getDefinition("multiple_monitors")),
    ],
    ["ram", collectRam(getDefinition("ram"), snapshot)],
    ["cpu", collectCpu(getDefinition("cpu"), snapshot)],
    ["battery", collectBattery(getDefinition("battery"), snapshot)],
    ["vpn", collectVpn(getDefinition("vpn"), snapshot)],
    [
      "virtual_machine",
      collectVirtualMachine(getDefinition("virtual_machine"), snapshot),
    ],
    [
      "screen_recording",
      collectScreenRecording(getDefinition("screen_recording"), snapshot),
    ],
    [
      "running_applications",
      collectRunningApplications(
        getDefinition("running_applications"),
        snapshot,
      ),
    ],
    [
      "remote_desktop",
      collectRemoteDesktop(getDefinition("remote_desktop"), snapshot),
    ],
    ["obs", collectObs(getDefinition("obs"), snapshot)],
    ["teamviewer", collectTeamViewer(getDefinition("teamviewer"), snapshot)],
    ["anydesk", collectAnyDesk(getDefinition("anydesk"), snapshot)],
    ["clipboard", collectClipboard(getDefinition("clipboard"))],
    [
      "browser_version",
      collectBrowserVersion(getDefinition("browser_version")),
    ],
  ];

  for (const [id, result] of nativeResults) {
    results.set(id, result);
  }

  const checks = CHECK_DEFINITIONS.map((definition) =>
    results.get(definition.id),
  ).filter((check): check is CheckResult => Boolean(check));

  const enrichedChecks = await enrichChecksWithDetectedApps(checks);

  return {
    runId,
    startedAt,
    finishedAt: new Date().toISOString(),
    platform: process.platform,
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron ?? "",
    chromiumVersion: process.versions.chrome ?? "",
    checks: enrichedChecks,
    ...evaluateReport(enrichedChecks),
  };
}

export function getCheckDefinitions(): CheckDefinition[] {
  return CHECK_DEFINITIONS;
}
