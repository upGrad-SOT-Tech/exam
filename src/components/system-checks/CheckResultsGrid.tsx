import type { CheckResult } from '@/lib/system-checks/types'
import { CHECK_CATEGORIES } from '@/lib/system-checks/groups'
import { AlertTriangle, Check, Loader2, Minus, X } from 'lucide-react'

function StatusGlyph({ status, isRunning }: { status: CheckResult['status']; isRunning: boolean }) {
  if (isRunning || status === 'running') {
    return (
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#df2428]/10">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#df2428]" />
      </span>
    )
  }
  if (status === 'passed') {
    return (
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-50">
        <Check className="h-3.5 w-3.5 text-green-600" strokeWidth={3} />
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-50">
        <X className="h-3.5 w-3.5 text-[#df2428]" strokeWidth={3} />
      </span>
    )
  }
  if (status === 'warning') {
    return (
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-50">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" strokeWidth={2.5} />
      </span>
    )
  }
  return (
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-50">
      <Minus className="h-3.5 w-3.5 text-gray-300" />
    </span>
  )
}

type CheckResultsGridProps = {
  checks: CheckResult[]
  isRunning: boolean
}

export default function CheckResultsGrid({ checks, isRunning }: CheckResultsGridProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {CHECK_CATEGORIES.map((category, categoryIndex) => {
        const items = checks.filter((check) => category.checks.includes(check.id))

        return (
          <section key={category.id} className={categoryIndex > 0 ? 'border-t border-gray-100' : ''}>
            <div className="bg-[#fafbfc] px-5 py-2.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                {category.label}
              </p>
            </div>
            <div className="grid gap-px bg-gray-100 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((check) => {
                const showDetail = check.status === 'failed' || check.status === 'warning'

                return (
                  <div key={check.id} className="bg-white px-5 py-4">
                    <div className="flex items-start gap-3">
                      <StatusGlyph status={check.status} isRunning={isRunning} />
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm font-medium leading-snug text-gray-900">{check.label}</p>
                        {showDetail ? (
                          <p className="mt-1 text-xs leading-relaxed text-gray-500">{check.message}</p>
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
