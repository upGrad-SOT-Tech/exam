import type {
  CheckDefinition,
  CheckResult,
  MediaCheckInput,
  SystemCheckReport,
} from "./types";

const IPC = {
  RUN_ALL: "system-checks:run-all",
  GET_DEFINITIONS: "system-checks:get-definitions",
  CLEAR_CLIPBOARD: "system-checks:clear-clipboard",
} as const;

function getBridge() {
  return window.systemChecks;
}

export function isSystemChecksAvailable(): boolean {
  return Boolean(getBridge()?.isAvailable?.());
}

export async function getCheckDefinitions(): Promise<CheckDefinition[]> {
  const bridge = getBridge();
  if (!bridge) return [];
  return bridge.getDefinitions();
}

export async function runSystemChecks(
  media?: MediaCheckInput,
): Promise<SystemCheckReport> {
  const bridge = getBridge();
  if (!bridge) {
    throw new Error("System checks are only available in the desktop app");
  }
  return bridge.runAll(media);
}

export async function clearSystemClipboard(): Promise<{
  cleared: boolean;
  remainingFormats: string[];
}> {
  const bridge = getBridge();
  if (!bridge?.clearClipboard) {
    throw new Error("Clear clipboard is only available in the desktop app");
  }
  return bridge.clearClipboard();
}

export async function submitSystemCheckAudit(
  report: SystemCheckReport,
): Promise<void> {
  try {
    await fetch("/api/system-checks/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId: report.runId,
        startedAt: report.startedAt,
        finishedAt: report.finishedAt,
        platform: report.platform,
        appVersion: report.appVersion,
        passed: report.passed,
        blocked: report.blocked,
        checks: report.checks,
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to submit system check audit";
    console.error(message);
  }
}

export type MediaCheckOutcome = Pick<MediaCheckInput, "webcam" | "microphone">;

function mediaResult(
  id: "webcam" | "microphone",
  label: string,
  status: CheckResult["status"],
  message: string,
  startedAt: number,
  details?: Record<string, unknown>,
): CheckResult {
  return {
    id,
    label,
    status,
    severity: "block",
    message,
    details,
    durationMs: Date.now() - startedAt,
  };
}

async function probeMediaPermission(
  kind: "video" | "audio",
  startedAt: number,
): Promise<CheckResult> {
  const id = kind === "video" ? "webcam" : "microphone";
  const label = kind === "video" ? "Webcam available" : "Mic available";
  const device = kind === "video" ? "Camera" : "Microphone";

  try {
    const stream = await navigator.mediaDevices.getUserMedia(
      kind === "video" ? { video: true } : { audio: true },
    );
    // Permission probe only — release the device immediately. The live preview is opened later, on
    // the Camera & mic step.
    stream.getTracks().forEach((track) => track.stop());
    return mediaResult(id, label, "passed", `${device} ready — permission granted`, startedAt, {
      reason: "granted",
    });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotAllowedError" || name === "SecurityError") {
      return mediaResult(
        id,
        label,
        "failed",
        `${device} access denied. Allow it and re-run — on macOS enable "upGrad Exam" under System Settings ▸ Privacy & Security ▸ ${device}.`,
        startedAt,
        { reason: "permission_denied" },
      );
    }
    if (
      name === "NotFoundError" ||
      name === "DevicesNotFoundError" ||
      name === "OverconstrainedError"
    ) {
      return mediaResult(id, label, "failed", `No ${device.toLowerCase()} detected`, startedAt, {
        reason: "not_found",
      });
    }
    return mediaResult(
      id,
      label,
      "failed",
      error instanceof Error ? error.message : `${device} check failed`,
      startedAt,
      { reason: "error" },
    );
  }
}

export async function runMediaChecks(): Promise<MediaCheckOutcome> {
  const startedAt = Date.now();

  if (!navigator.mediaDevices?.getUserMedia) {
    const unavailable = "Media devices API unavailable";
    return {
      webcam: mediaResult("webcam", "Webcam available", "failed", unavailable, startedAt),
      microphone: mediaResult("microphone", "Mic available", "failed", unavailable, startedAt),
    };
  }

  // Actively request OS camera/microphone permission here — the first pre-exam step — instead of
  // only enumerating devices (which never triggers the prompt). A denial fails these block-severity
  // checks, so the student is stopped up front and asked to grant access, rather than clearing
  // System + Apps and only hitting a dead camera at the calibration handoff. Probe one device at a
  // time so webcam and microphone report independent pass/fail.
  const webcam = await probeMediaPermission("video", startedAt);
  const microphone = await probeMediaPermission("audio", startedAt);
  return { webcam, microphone };
}

export { IPC };
