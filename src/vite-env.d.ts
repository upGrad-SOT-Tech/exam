/// <reference types="vite/client" />

import type { SystemChecksApi } from "@/lib/system-checks/types";
import type { ProctoringApi } from "@/lib/proctoring/types";
import type { ExamLauncherApi } from "@/lib/deep-link/types";

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_STORAGE_BUCKET: string;
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};

declare global {
  interface Window {
    systemChecks?: SystemChecksApi;
    proctoring?: ProctoringApi;
    examLauncher?: ExamLauncherApi;
  }
}
