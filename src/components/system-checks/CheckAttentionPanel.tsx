import { useEffect, useState } from 'react'
import AppIcon from '@/components/system-checks/AppIcon'
import type { AttentionItem } from '@/lib/system-checks/messages'
import type { DetectedApp } from '@/lib/system-checks/detected-app'

type CheckAttentionPanelProps = {
  items: AttentionItem[]
  /** Absent outside Electron — the panel then shows manual quit instructions only. */
  onCloseApps?: (apps: DetectedApp[]) => void
  closing?: boolean
  closeNote?: string | null
}

export default function CheckAttentionPanel({
  items,
  onCloseApps,
  closing = false,
  closeNote = null,
}: CheckAttentionPanelProps) {
  // Quitting someone's apps is destructive enough to need a deliberate second click, so the button
  // reveals what will be closed and waits for confirmation instead of acting immediately.
  const [confirming, setConfirming] = useState(false)
  const blockingApps = items.filter((item) => item.kind === 'app').map((item) => item.app)

  useEffect(() => {
    if (blockingApps.length === 0) setConfirming(false)
  }, [blockingApps.length])

  if (items.length === 0) {
    return (
      <div className="border border-green-200 bg-green-50 px-4 py-4">
        <p className="text-sm font-medium text-green-800">Everything looks good</p>
        <p className="mt-1 text-xs text-green-700">All checks passed. You can continue to login.</p>
        {closeNote ? <p className="mt-2 text-xs text-green-700">{closeNote}</p> : null}
      </div>
    )
  }

  const canAutoClose = Boolean(onCloseApps) && blockingApps.length > 0

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Fix these before login ({items.length})
      </p>

      {closeNote ? (
        <p className="border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">{closeNote}</p>
      ) : null}

      {canAutoClose ? (
        <div className="border border-gray-300 bg-white px-3 py-3">
          {confirming ? (
            <>
              <p className="text-sm font-semibold text-gray-900">
                Close {blockingApps.length} {blockingApps.length === 1 ? 'application' : 'applications'}?
              </p>
              <p className="mt-1 text-xs leading-relaxed text-gray-700">
                We'll ask {blockingApps.map((app) => app.displayName).join(', ')} to quit. Save any
                open work first — anything unsaved in those apps could be lost.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={closing}
                  onClick={() => {
                    setConfirming(false)
                    onCloseApps?.(blockingApps)
                  }}
                  className="rounded-md bg-[#df2428] px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#c91f23] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {closing ? 'Closing…' : 'Yes, close them'}
                </button>
                <button
                  type="button"
                  disabled={closing}
                  onClick={() => setConfirming(false)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 transition hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-900">
                Close blocked apps automatically
              </p>
              <p className="mt-1 text-xs leading-relaxed text-gray-700">
                Save your work, then let us quit the {blockingApps.length} blocked{' '}
                {blockingApps.length === 1 ? 'app' : 'apps'} and re-run the checks for you.
              </p>
              <button
                type="button"
                disabled={closing}
                onClick={() => setConfirming(true)}
                className="mt-3 rounded-md border border-[#df2428] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#df2428] transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {closing ? 'Closing…' : `Close ${blockingApps.length} and re-check`}
              </button>
            </>
          )}
        </div>
      ) : null}

      {items.map((item) => {
        const isFailed = item.severity === 'failed'
        const borderClass = isFailed ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
        const titleClass = isFailed ? 'text-[#df2428]' : 'text-amber-800'

        if (item.kind === 'app') {
          return (
            <article key={`${item.app.path ?? item.app.processName}-${item.app.pid}`} className={`border px-3 py-3 ${borderClass}`}>
              <div className="flex gap-3">
                <AppIcon app={item.app} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${titleClass}`}>{item.app.displayName}</p>
                  <p className="mt-0.5 text-xs text-gray-600">Process: {item.app.processName}</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-700">
                    This application is running and must be closed before the exam.
                  </p>
                  {item.flaggedBy.length > 0 ? (
                    <p className="mt-1 text-[11px] text-gray-500">Flagged by: {item.flaggedBy.join(', ')}</p>
                  ) : null}
                  <p className="mt-2 text-xs font-medium text-gray-800">
                    {canAutoClose
                      ? `Use the button above, or quit ${item.app.displayName} yourself and re-run checks.`
                      : `Quit ${item.app.displayName} from Activity Monitor or the application menu, then re-run checks.`}
                  </p>
                </div>
              </div>
            </article>
          )
        }

        return (
          <article key={item.check.id} className={`border px-3 py-3 ${borderClass}`}>
            <p className={`text-sm font-semibold ${titleClass}`}>{item.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-700">{item.summary}</p>
            <p className="mt-2 text-xs font-medium text-gray-800">{item.fixHint}</p>
          </article>
        )
      })}
    </div>
  )
}
