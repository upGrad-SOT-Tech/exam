import type { CheckResult } from '@/lib/system-checks/types'

type CheckSummaryBarProps = {
  checks: CheckResult[]
  isRunning: boolean
  hasPassed: boolean
}

export default function CheckSummaryBar({ checks, isRunning, hasPassed }: CheckSummaryBarProps) {
  const total = checks.length
  const passed = checks.filter((check) => check.status === 'passed').length
  const failed = checks.filter((check) => check.status === 'failed').length
  const warnings = checks.filter((check) => check.status === 'warning').length

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-gray-200 bg-white px-4 py-3">
      <div>
        <p className="text-2xl font-extrabold text-[#df2428]">
          {isRunning ? 'Checking…' : `${passed}/${total}`}
          <span className="ml-2 text-sm font-semibold text-gray-500">checks passed</span>
        </p>
        <p className="mt-0.5 text-sm text-gray-700">
          {isRunning
            ? 'Please wait while we verify your device.'
            : hasPassed
              ? 'You can continue to login.'
              : 'Resolve the items on the right, then re-run checks.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        <span className="border border-green-200 bg-green-50 px-2.5 py-1 text-green-700">{passed} passed</span>
        {failed > 0 ? (
          <span className="border border-red-200 bg-red-50 px-2.5 py-1 text-[#df2428]">{failed} failed</span>
        ) : null}
        {warnings > 0 ? (
          <span className="border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">{warnings} warnings</span>
        ) : null}
      </div>
    </div>
  )
}
