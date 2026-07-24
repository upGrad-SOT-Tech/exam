import type { CheckId, CheckResult } from "./types";
import type { DetectedApp } from "./detected-app";

export type AppAttentionItem = {
  kind: "app";
  severity: "failed" | "warning";
  app: DetectedApp;
  flaggedBy: string[];
};

export type CheckAttentionItem = {
  kind: "check";
  severity: "failed" | "warning";
  check: CheckResult;
  title: string;
  summary: string;
  fixHint: string;
};

export type AttentionItem = AppAttentionItem | CheckAttentionItem;

const CHECK_COPY: Partial<
  Record<CheckId, { title: string; summary: string; fixHint: string }>
> = {
  webcam: {
    title: "Camera not available",
    summary: "Camera access is required for proctoring.",
    fixHint:
      'Allow camera access, then Re-run. On macOS enable "upGrad Exam" under System Settings ▸ Privacy & Security ▸ Camera.',
  },
  microphone: {
    title: "Microphone not available",
    summary: "Microphone access is required for proctoring.",
    fixHint:
      'Allow microphone access, then Re-run. On macOS enable "upGrad Exam" under System Settings ▸ Privacy & Security ▸ Microphone.',
  },
  internet_speed: {
    title: "Internet too slow",
    summary: "Your connection did not meet the minimum speed for the exam.",
    fixHint: "Use a stable Wi-Fi or wired connection, then re-run checks.",
  },
  screen_resolution: {
    title: "Screen resolution too low",
    summary: "Your display must be at least 1280×720.",
    fixHint: "Increase resolution in system display settings.",
  },
  ram: {
    title: "Not enough RAM",
    summary: "Your device needs at least 4 GB memory.",
    fixHint: "Close unused apps and restart if needed.",
  },
  cpu: {
    title: "CPU below requirement",
    summary: "Your device needs at least 2 CPU cores.",
    fixHint: "Close heavy background apps before the exam.",
  },
  battery: {
    title: "Battery low",
    summary: "Your battery is low and the device is not charging.",
    fixHint: "Plug in your charger before starting the exam.",
  },
  vpn: {
    title: "VPN detected",
    summary: "VPN connections are not allowed during the exam.",
    fixHint: "Disconnect VPN completely and disable auto-connect.",
  },
  virtual_machine: {
    title: "Virtual machine detected",
    summary: "Exams must be taken on a physical computer, not a VM.",
    fixHint: "Use a physical laptop or desktop.",
  },
  multiple_monitors: {
    title: "Multiple monitors detected",
    summary:
      "Only one display is allowed during the exam. External or HDMI screens are not permitted, even when mirroring your screen.",
    fixHint:
      "Unplug every external/HDMI monitor and turn off screen mirroring, then re-run checks. Use your built-in screen only.",
  },
  screen_recording: {
    title: "Screen recording software",
    summary: "Screen recording tools are not allowed during the exam.",
    fixHint: "Use Close on the process card, then re-run checks.",
  },
  ai_assistant: {
    title: "AI assistant tool detected",
    summary:
      "Hidden AI assistant/overlay tools (e.g. Parakeet, Cluely, Interview Coder) are not allowed. They stay invisible to screen sharing but still run on your device.",
    fixHint:
      "Quit the tool completely — also remove it from Login Items so it does not relaunch — then re-run checks.",
  },
  clipboard: {
    title: "Clipboard not empty",
    summary: "Copied text or files were found on your clipboard.",
    fixHint: "Use Clear clipboard below — copying a blank space does not remove clipboard data.",
  },
  browser_version: {
    title: "App version outdated",
    summary: "This exam app version is not supported.",
    fixHint: "Update the application to the latest version.",
  },
};

function readDetectedApps(check: CheckResult): DetectedApp[] {
  const detectedApps = check.details?.detectedApps;
  if (!Array.isArray(detectedApps)) return [];

  const apps: DetectedApp[] = [];
  for (const entry of detectedApps) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const processName =
      typeof item.processName === "string" ? item.processName : "";
    const displayName =
      typeof item.displayName === "string" ? item.displayName : processName;
    const pid = typeof item.pid === "number" ? item.pid : 0;
    const processPath = typeof item.path === "string" ? item.path : undefined;
    const iconDataUrl =
      typeof item.iconDataUrl === "string" ? item.iconDataUrl : undefined;
    if (!processName) continue;
    apps.push({
      pid,
      processName,
      displayName,
      path: processPath,
      iconDataUrl,
    });
  }
  return apps;
}

function appKey(app: DetectedApp): string {
  return (app.path || `${app.displayName}:${app.processName}`).toLowerCase();
}

export function getAttentionItems(checks: CheckResult[]): AttentionItem[] {
  const actionable = checks.filter(
    (check) => check.status === "failed" || check.status === "warning",
  );
  const appMap = new Map<string, AppAttentionItem>();
  const generic: CheckAttentionItem[] = [];

  for (const check of actionable) {
    const detectedApps = readDetectedApps(check);

    if (detectedApps.length > 0) {
      const severity = check.status === "failed" ? "failed" : "warning";
      for (const app of detectedApps) {
        const key = appKey(app);
        const existing = appMap.get(key);
        if (!existing) {
          appMap.set(key, {
            kind: "app",
            severity,
            app,
            flaggedBy: [check.label],
          });
          continue;
        }

        if (severity === "failed") existing.severity = "failed";
        if (!existing.flaggedBy.includes(check.label))
          existing.flaggedBy.push(check.label);
      }
      continue;
    }

    if (check.id === "running_applications") continue;

    const copy = CHECK_COPY[check.id];
    generic.push({
      kind: "check",
      severity: check.status === "failed" ? "failed" : "warning",
      check,
      title: copy?.title ?? check.label,
      summary: copy?.summary ?? check.message,
      fixHint: copy?.fixHint ?? "Resolve the issue and re-run checks.",
    });
  }

  return [...appMap.values(), ...generic];
}
