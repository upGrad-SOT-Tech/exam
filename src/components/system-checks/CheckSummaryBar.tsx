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
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm sm:px-6 sm:py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-2xl font-extrabold tracking-tight text-[#df2428] sm:text-[1.75rem]">
            {isRunning ? 'Checking…' : `${passed}/${total}`}
            <span className="ml-2 text-sm font-semibold text-gray-500">checks passed</span>
          </p>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-gray-600">
            {isRunning
              ? 'Please wait while we verify your device.'
              : hasPassed
                ? 'All required checks passed. You can continue.'
                : 'Fix the items on the right, then re-run checks.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
            {passed} passed
          </span>
          {failed > 0 ? (
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-[#df2428]">
              {failed} failed
            </span>
          ) : null}
          {warnings > 0 ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
              {warnings} warnings
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
