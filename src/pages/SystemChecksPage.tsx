import { useEffect, useMemo, useRef } from "react";
import { logoUrl } from "@/assets/brand";
import { useNavigate } from "react-router-dom";
import CheckAttentionPanel from "@/components/system-checks/CheckAttentionPanel";
import CheckResultsGrid from "@/components/system-checks/CheckResultsGrid";
import CheckSummaryBar from "@/components/system-checks/CheckSummaryBar";
import { useSystemChecks } from "@/hooks/useSystemChecks";
import { getAttentionItems } from "@/lib/system-checks/messages";
import { hasValidPassedSession } from "@/lib/system-checks/session";

export default function SystemChecksPage() {
  const navigate = useNavigate();
  const {
    checks,
    state,
    error,
    definitions,
    desktopAvailable,
    runChecks,
    hasPassed,
  } = useSystemChecks();
  const isRunning = state === "running";
  const attentionItems = useMemo(() => getAttentionItems(checks), [checks]);
  const hasAutoRun = useRef(false);

  useEffect(() => {
    if (hasValidPassedSession()) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (
      !desktopAvailable ||
      hasAutoRun.current ||
      definitions.length === 0 ||
      state !== "idle"
    )
      return;
    hasAutoRun.current = true;
    void runChecks();
  }, [desktopAvailable, definitions.length, runChecks, state]);

  const primaryButtonClass =
    "rounded-md bg-[#df2428] px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#c91f23] disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="flex h-screen flex-col bg-[#f8f9fb]">
      <header className="shrink-0 border-b border-gray-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <img
              src={logoUrl}
              alt="upGrad"
              className="h-8"
            />
            <h1 className="mt-2 text-2xl font-extrabold text-[#df2428]">
              System readiness
            </h1>
            <p className="mt-1 text-sm text-gray-700">
              All checks must pass before you sign in. Close any blocked apps
              shown on the right.
            </p>
          </div>
          <div className="hidden shrink-0 sm:block">
            <button
              type="button"
              className="rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isRunning || !desktopAvailable}
              onClick={() => void runChecks()}
            >
              {isRunning ? "Checking…" : "Re-run checks"}
            </button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden px-5 py-4">
        {!desktopAvailable ? (
          <div className="mb-3 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Open the desktop application to run full system checks.
          </div>
        ) : null}

        {error ? (
          <div className="mb-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex h-full min-h-0 flex-col gap-3">
          <CheckSummaryBar
            checks={checks}
            isRunning={isRunning}
            hasPassed={hasPassed}
          />

          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1.45fr_0.75fr]">
            <div className="min-h-0 overflow-y-auto">
              <CheckResultsGrid checks={checks} isRunning={isRunning} />
            </div>

            <div className="min-h-0 overflow-y-auto lg:max-h-full">
              <CheckAttentionPanel items={attentionItems} />
            </div>
          </div>
        </div>
      </main>

      <footer className="shrink-0 border-t border-gray-200 bg-white px-5 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-600">
            {hasPassed
              ? "Checks passed for this session."
              : "Close blocked apps, then re-run checks."}
          </p>
          <div className="flex gap-2 sm:hidden">
            <button
              type="button"
              className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800"
              disabled={isRunning || !desktopAvailable}
              onClick={() => void runChecks()}
            >
              Re-run
            </button>
          </div>
          <button
            type="button"
            className={`${primaryButtonClass} w-full sm:w-auto`}
            disabled={!hasPassed}
            onClick={() => navigate("/login", { replace: true })}
          >
            Continue to login
          </button>
        </div>
      </footer>
    </div>
  );
}
