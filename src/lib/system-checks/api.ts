import type {
  CheckDefinition,
  CheckResult,
  MediaCheckInput,
  SystemCheckReport,
} from "./types";

const IPC = {
  RUN_ALL: "system-checks:run-all",
  GET_DEFINITIONS: "system-checks:get-definitions",
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

export async function runMediaChecks(): Promise<MediaCheckOutcome> {
  const startedAt = Date.now();

  if (!navigator.mediaDevices?.enumerateDevices) {
    return {
      webcam: mediaResult(
        "webcam",
        "Webcam available",
        "failed",
        "Media devices API unavailable",
        startedAt,
      ),
      microphone: mediaResult(
        "microphone",
        "Mic available",
        "failed",
        "Media devices API unavailable",
        startedAt,
      ),
    };
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter(
      (device) => device.kind === "videoinput",
    );
    const audioInputs = devices.filter(
      (device) => device.kind === "audioinput",
    );

    let webcamStatus: CheckResult["status"] =
      videoInputs.length > 0 ? "passed" : "failed";
    let micStatus: CheckResult["status"] =
      audioInputs.length > 0 ? "passed" : "failed";
    let webcamMessage =
      videoInputs.length > 0
        ? `${videoInputs.length} webcam device(s) found`
        : "No webcam detected";
    let micMessage =
      audioInputs.length > 0
        ? `${audioInputs.length} microphone device(s) found`
        : "No microphone detected";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      stream.getTracks().forEach((track) => track.stop());
      webcamStatus = "passed";
      micStatus = "passed";
      webcamMessage = "Webcam permission granted";
      micMessage = "Microphone permission granted";
    } catch (permissionError) {
      if (videoInputs.length === 0) webcamStatus = "failed";
      if (audioInputs.length === 0) micStatus = "failed";
      if (permissionError instanceof Error && videoInputs.length > 0) {
        webcamMessage = permissionError.message;
      }
      if (permissionError instanceof Error && audioInputs.length > 0) {
        micMessage = permissionError.message;
      }
    }

    return {
      webcam: mediaResult(
        "webcam",
        "Webcam available",
        webcamStatus,
        webcamMessage,
        startedAt,
        {
          count: videoInputs.length,
        },
      ),
      microphone: mediaResult(
        "microphone",
        "Mic available",
        micStatus,
        micMessage,
        startedAt,
        {
          count: audioInputs.length,
        },
      ),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Media check failed";
    return {
      webcam: mediaResult(
        "webcam",
        "Webcam available",
        "failed",
        message,
        startedAt,
      ),
      microphone: mediaResult(
        "microphone",
        "Mic available",
        "failed",
        message,
        startedAt,
      ),
    };
  }
}

export { IPC };
