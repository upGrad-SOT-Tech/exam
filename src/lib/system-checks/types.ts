export type CheckStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "warning"
  | "skipped";

export type CheckId =
  | "webcam"
  | "microphone"
  | "internet_speed"
  | "screen_resolution"
  | "ram"
  | "cpu"
  | "battery"
  | "vpn"
  | "virtual_machine"
  | "multiple_monitors"
  | "screen_recording"
  | "ai_assistant"
  | "running_applications"
  | "remote_desktop"
  | "obs"
  | "teamviewer"
  | "anydesk"
  | "clipboard"
  | "browser_version";

export type CheckSeverity = "block" | "warn";

export type CheckDefinition = {
  id: CheckId;
  label: string;
  severity: CheckSeverity;
  timeoutMs: number;
};

export type CheckResult = {
  id: CheckId;
  label: string;
  status: CheckStatus;
  severity: CheckSeverity;
  message: string;
  details?: Record<string, unknown>;
  durationMs: number;
};

export type SystemCheckReport = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  platform: string;
  appVersion: string;
  electronVersion: string;
  chromiumVersion: string;
  checks: CheckResult[];
  passed: boolean;
  blocked: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
};

export type MediaCheckInput = {
  webcam: CheckResult;
  microphone: CheckResult;
};

export type SystemChecksApi = {
  getDefinitions: () => Promise<CheckDefinition[]>;
  runAll: (media?: MediaCheckInput) => Promise<SystemCheckReport>;
  clearClipboard: () => Promise<{ cleared: boolean; remainingFormats: string[] }>;
  isAvailable: () => boolean;
};
