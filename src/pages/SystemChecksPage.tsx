import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { logoUrl } from '@/assets/brand'
import { closeRunningApps } from '@/lib/proctoring/api'
import type { DetectedApp } from '@/lib/system-checks/detected-app'
import CheckAttentionPanel from '@/components/system-checks/CheckAttentionPanel'
import CheckResultsGrid from '@/components/system-checks/CheckResultsGrid'
import CheckSummaryBar from '@/components/system-checks/CheckSummaryBar'
import { useAuth } from '@/context/AuthContext'
import { useSystemChecks } from '@/hooks/useSystemChecks'
import { getAttentionItems } from '@/lib/system-checks/messages'
import { hasValidPassedSession } from '@/lib/system-checks/session'

type SystemChecksPageProps = {
  /** Pre-login gate vs in-app re-check inside the shell */
  mode?: 'gate' | 'app'
}

export default function SystemChecksPage({ mode = 'gate' }: SystemChecksPageProps) {
  const navigate = useNavigate()
  const { status } = useAuth()
  const {
    checks,
    state,
    error,
    definitions,
    desktopAvailable,
    runChecks,
    hasPassed,
  } = useSystemChecks()
  const isRunning = state === 'running'
  const attentionItems = useMemo(() => getAttentionItems(checks), [checks])
  const hasAutoRun = useRef(false)
  const inApp = mode === 'app'
  const isAuthenticated = status === 'authenticated'
  const [closingApps, setClosingApps] = useState(false)
  const [closeNote, setCloseNote] = useState<string | null>(null)

  /**
   * Quits the apps blocking the exam on the candidate's behalf, then re-runs the checks.
   *
   * Consent is taken in the panel before this ever fires. The main process sends SIGTERM (a normal
   * quit request, not a kill) and refuses anything on the allow-list, so system processes are never
   * touched. We pause before re-checking because a process that has agreed to quit is still alive
   * for a moment, and re-scanning too early would report it as still running.
   */
  const handleCloseApps = useCallback(
    async (apps: DetectedApp[]) => {
      if (apps.length === 0) return
      setClosingApps(true)
      setCloseNote(null)
      try {
        const result = await closeRunningApps(apps.map((app) => app.pid))
        const notes: string[] = []
        if (result.closed.length > 0) notes.push(`Closed ${result.closed.length}.`)
        if (result.skipped.length > 0) {
          notes.push(`Skipped ${result.skipped.map((app) => app.displayName).join(', ')} (allowed).`)
        }
        if (result.failed.length > 0) {
          notes.push(
            `Couldn't close ${result.failed
              .map((item) => item.displayName)
              .join(', ')} — quit ${result.failed.length === 1 ? 'it' : 'them'} manually.`,
          )
        }
        setCloseNote(notes.join(' ') || 'Nothing needed closing.')
        await new Promise((resolve) => window.setTimeout(resolve, 900))
        await runChecks()
      } catch (err) {
        setCloseNote(err instanceof Error ? err.message : 'Unable to close the blocked apps.')
      } finally {
        setClosingApps(false)
      }
    },
    [runChecks],
  )

  useEffect(() => {
    // Only the pre-login gate should bounce away after a passed session.
    if (inApp) return
    if (status === 'loading') return
    if (isAuthenticated) {
      navigate('/system-check', { replace: true })
      return
    }
    if (hasValidPassedSession()) {
      navigate('/login', { replace: true })
    }
  }, [inApp, isAuthenticated, navigate, status])

  useEffect(() => {
    if (
      !desktopAvailable ||
      hasAutoRun.current ||
      definitions.length === 0 ||
      state !== 'idle'
    ) {
      return
    }
    hasAutoRun.current = true
    void runChecks()
  }, [desktopAvailable, definitions.length, runChecks, state])

  const primaryButtonClass =
    'rounded-md bg-[#df2428] px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#c51f23] disabled:cursor-not-allowed disabled:opacity-60'

  const body = (
    <>
      {!desktopAvailable ? (
        <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Open the desktop application to run full system checks.
        </div>
      ) : null}

      {error ? (
        <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className={`flex min-h-0 flex-col gap-3 ${inApp ? '' : 'h-full'}`}>
        <CheckSummaryBar checks={checks} isRunning={isRunning} hasPassed={hasPassed} />

        <div
          className={`grid gap-3 lg:grid-cols-[1.45fr_0.75fr] ${
            inApp ? '' : 'min-h-0 flex-1'
          }`}
        >
          <div className={inApp ? '' : 'min-h-0 overflow-y-auto'}>
            <CheckResultsGrid checks={checks} isRunning={isRunning} />
          </div>
          <div className={inApp ? '' : 'min-h-0 overflow-y-auto lg:max-h-full'}>
            <CheckAttentionPanel
              items={attentionItems}
              onCloseApps={desktopAvailable ? handleCloseApps : undefined}
              closing={closingApps}
              closeNote={closeNote}
            />
          </div>
        </div>
      </div>
    </>
  )

  if (inApp) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-[#df2428]" />
              Device readiness
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#0f1115] sm:text-4xl">
              System check
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500">
              Re-run readiness checks anytime. Close blocked apps, then continue when all checks
              pass.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0f1115] shadow-soft transition hover:bg-gray-50 disabled:opacity-50"
              disabled={isRunning || !desktopAvailable}
              onClick={() => void runChecks()}
            >
              {isRunning ? 'Checking…' : 'Re-run checks'}
            </button>
            <Link
              to="/exams"
              className={`${primaryButtonClass} inline-flex items-center justify-center rounded-full px-4 py-2.5`}
            >
              Back to exams
            </Link>
          </div>
        </div>
        {body}
        <div className="flex flex-col gap-2 rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <p>
            {hasPassed
              ? 'Checks passed for this session.'
              : 'Close blocked apps, then re-run checks.'}
          </p>
          <button
            type="button"
            className={`${primaryButtonClass} w-full sm:w-auto`}
            disabled={!hasPassed}
            onClick={() => navigate('/home')}
          >
            Continue to home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-[#f8f9fb]">
      <header className="shrink-0 border-b border-gray-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <img src={logoUrl} alt="upGrad" className="h-8" />
            <h1 className="mt-2 text-2xl font-extrabold text-[#df2428]">System readiness</h1>
            <p className="mt-1 text-sm text-gray-700">
              All checks must pass before you sign in. Close any blocked apps shown on the right.
            </p>
          </div>
          <div className="hidden shrink-0 sm:block">
            <button
              type="button"
              className="rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isRunning || !desktopAvailable}
              onClick={() => void runChecks()}
            >
              {isRunning ? 'Checking…' : 'Re-run checks'}
            </button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden px-5 py-4">{body}</main>

      <footer className="shrink-0 border-t border-gray-200 bg-white px-5 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-600">
            {hasPassed
              ? 'Checks passed for this session.'
              : 'Close blocked apps, then re-run checks.'}
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
            onClick={() => navigate('/login', { replace: true })}
          >
            Continue to login
          </button>
        </div>
      </footer>
    </div>
  )
}
