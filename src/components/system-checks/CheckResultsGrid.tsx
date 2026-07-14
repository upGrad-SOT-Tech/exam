import type { CheckResult } from '@/lib/system-checks/types'
import { CHECK_CATEGORIES } from '@/lib/system-checks/groups'
import { AlertTriangle, Check, Loader2, Minus, X } from 'lucide-react'

const BRAND = '#df2428'

function StatusGlyph({ status, isRunning }: { status: CheckResult['status']; isRunning: boolean }) {
  if (isRunning || status === 'running') {
    return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#df2428]" />
  }
  if (status === 'passed') return <Check className="h-3.5 w-3.5 shrink-0 text-green-600" strokeWidth={3} />
  if (status === 'failed') return <X className="h-3.5 w-3.5 shrink-0 text-[#df2428]" strokeWidth={3} />
  if (status === 'warning') return <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" strokeWidth={2.5} />
  return <Minus className="h-3.5 w-3.5 shrink-0 text-gray-300" />
}

type CheckResultsGridProps = {
  checks: CheckResult[]
  isRunning: boolean
}

export default function CheckResultsGrid({ checks, isRunning }: CheckResultsGridProps) {
  return (
    <div className="border border-gray-200 bg-white">
      {CHECK_CATEGORIES.map((category, categoryIndex) => {
        const items = checks.filter((check) => category.checks.includes(check.id))

        return (
          <section key={category.id} className={categoryIndex > 0 ? 'border-t border-gray-200' : ''}>
            <div className="border-b border-gray-100 bg-[#fafafa] px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{category.label}</p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-gray-100 md:grid-cols-3 xl:grid-cols-4">
              {items.map((check) => {
                const showDetail = check.status === 'failed' || check.status === 'warning'

                return (
                  <div key={check.id} className="bg-white px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <StatusGlyph status={check.status} isRunning={isRunning} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium leading-tight text-gray-900">{check.label}</p>
                        {showDetail ? (
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-gray-500">{check.message}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export { BRAND }
