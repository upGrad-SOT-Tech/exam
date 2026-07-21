import { useEffect, useState } from 'react'
import { Download, Shield } from 'lucide-react'
import { listExamHistory } from '@/lib/exams/api'
import type { ExamHistoryItem } from '@/lib/exams/types'

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function exportCsv(items: ExamHistoryItem[]) {
  const header = ['Exam', 'Date', 'Duration', 'Score', 'Total', 'Integrity']
  const rows = items.map((item) => [
    JSON.stringify(item.examTitle),
    formatDate(item.submittedAt),
    formatDuration(item.durationSeconds),
    String(item.score ?? 'Pending'),
    String(item.totalMarks),
    item.resultsReleased === false ? 'PENDING_RELEASE' : item.integrity.toUpperCase(),
  ])
  const csv = [header.join(','), ...rows.map((row) => row.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `exam-history-${Date.now()}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function HistoryPage() {
  const [items, setItems] = useState<ExamHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listExamHistory()
      .then((history) => {
        if (!cancelled) setItems(history)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load history')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Exam history</h1>
          <p className="mt-2 text-sm text-gray-500">Submitted attempts with integrity status.</p>
        </div>
        <button
          type="button"
          disabled={items.length === 0}
          onClick={() => exportCsv(items)}
          className="inline-flex items-center gap-2 text-sm font-bold text-brand disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f9f1ed] text-[11px] font-bold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">Exam</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Duration</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Integrity</th>
                <th className="px-5 py-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-gray-500">
                    Loading history…
                  </td>
                </tr>
              ) : null}
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                    No submitted exams yet. Complete an attempt to see it here.
                  </td>
                </tr>
              ) : null}
              {items.map((item) => (
                <tr key={item.attemptId} className="border-t border-gray-100">
                  <td className="px-5 py-4 font-semibold text-ink">{item.examTitle}</td>
                  <td className="px-5 py-4 text-gray-600">{formatDate(item.submittedAt)}</td>
                  <td className="px-5 py-4 text-gray-600">
                    {formatDuration(item.durationSeconds)}
                  </td>
                  <td className="px-5 py-4">
                    {item.score == null || item.resultsReleased === false ? (
                      <span className="text-xs font-bold uppercase text-amber-700">Pending release</span>
                    ) : (
                      <>
                        <span className="font-bold text-ink">{item.score}</span>
                        <span className="text-gray-400">/{item.totalMarks}</span>
                      </>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
                        item.integrity === 'clean'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      <Shield className="h-3 w-3" />
                      {item.integrity}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-bold text-brand">Review →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
