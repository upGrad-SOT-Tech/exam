import AppIcon from '@/components/system-checks/AppIcon'
import type { AttentionItem } from '@/lib/system-checks/messages'

type CheckAttentionPanelProps = {
  items: AttentionItem[]
}

export default function CheckAttentionPanel({ items }: CheckAttentionPanelProps) {
  if (items.length === 0) {
    return (
      <div className="border border-green-200 bg-green-50 px-4 py-4">
        <p className="text-sm font-medium text-green-800">Everything looks good</p>
        <p className="mt-1 text-xs text-green-700">All checks passed. You can continue to login.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Fix these before login ({items.length})
      </p>

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
                    Quit {item.app.displayName} from Activity Monitor or the application menu, then re-run checks.
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
