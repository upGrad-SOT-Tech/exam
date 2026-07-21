import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import AppIcon from '@/components/system-checks/AppIcon'
import type { AttentionItem } from '@/lib/system-checks/messages'
import { closeRunningApps } from '@/lib/proctoring/api'

type CheckAttentionPanelProps = {
  items: AttentionItem[]
  onResolved?: () => void
}

export default function CheckAttentionPanel({ items, onResolved }: CheckAttentionPanelProps) {
  const [closingPids, setClosingPids] = useState<number[]>([])
  const [closingAll, setClosingAll] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const closableApps = useMemo(
    () =>
      items.filter(
        (item): item is Extract<AttentionItem, { kind: 'app' }> =>
          item.kind === 'app' && item.app.pid > 0,
      ),
    [items],
  )

  const closePids = async (pids: number[]) => {
    const unique = [...new Set(pids.filter((pid) => pid > 0))]
    if (unique.length === 0) return

    setActionError(null)
    setClosingPids(unique)
    try {
      const result = await closeRunningApps(unique)
      if (result.failed.length > 0 && result.closed.length === 0) {
        setActionError(
          result.failed
            .map((item) => `${item.displayName}: ${item.reason}`)
            .join(' · '),
        )
      }
      window.setTimeout(() => onResolved?.(), 500)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to close processes')
    } finally {
      setClosingPids([])
      setClosingAll(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-5">
        <p className="text-sm font-semibold text-green-800">Everything looks good</p>
        <p className="mt-1 text-sm leading-relaxed text-green-700">
          All checks passed. You can continue.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
          Fix these ({items.length})
        </p>
        {closableApps.length > 0 ? (
          <button
            type="button"
            disabled={closingAll || closingPids.length > 0}
            onClick={() => {
              setClosingAll(true)
              void closePids(closableApps.map((item) => item.app.pid))
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            {closingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {closingAll
              ? 'Closing…'
              : `Close ${closableApps.length}`}
          </button>
        ) : null}
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        {actionError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            {actionError}
          </div>
        ) : null}

        {items.map((item) => {
          const isFailed = item.severity === 'failed'
          const shell = isFailed
            ? 'border-red-200 bg-red-50'
            : 'border-amber-200 bg-amber-50'
          const titleClass = isFailed ? 'text-[#df2428]' : 'text-amber-900'

          if (item.kind === 'app') {
            const canClose = item.app.pid > 0
            const busy = closingPids.includes(item.app.pid)
            return (
              <article
                key={`${item.app.path ?? item.app.processName}-${item.app.pid}`}
                className={`rounded-xl border px-4 py-3.5 ${shell}`}
              >
                <div className="flex items-start gap-3">
                  <AppIcon app={item.app} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${titleClass}`}>{item.app.displayName}</p>
                    <p className="mt-0.5 text-xs text-gray-600">Process: {item.app.processName}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-gray-700">
                      {canClose
                        ? 'Blocked for the exam — close it automatically below.'
                        : 'Quit this from Activity Monitor, then re-run checks.'}
                    </p>
                    {item.flaggedBy.length > 0 ? (
                      <p className="mt-1 text-[11px] text-gray-500">
                        Flagged by: {item.flaggedBy.join(', ')}
                      </p>
                    ) : null}
                    {canClose ? (
                      <button
                        type="button"
                        disabled={busy || closingAll}
                        onClick={() => void closePids([item.app.pid])}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#df2428] px-3 py-2 text-xs font-bold text-white hover:bg-[#c51f23] disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                        {busy ? 'Closing…' : `Close ${item.app.displayName}`}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          }

          return (
            <article key={item.check.id} className={`rounded-xl border px-4 py-3.5 ${shell}`}>
              <p className={`text-sm font-semibold ${titleClass}`}>{item.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-700">{item.summary}</p>
              <p className="mt-2 text-xs font-medium leading-relaxed text-gray-800">{item.fixHint}</p>
            </article>
          )
        })}
      </div>
    </div>
  )
}
