import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Clock3, Filter, ShieldCheck, Timer } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getDashboardSummary, listAvailableExams } from '@/lib/exams/api'
import type { DashboardSummary, ExamSummary } from '@/lib/exams/types'

type FilterKey = 'all' | 'available' | 'upcoming' | 'completed'

function closesLabel(until: string) {
  const ms = new Date(until).getTime() - Date.now()
  if (ms <= 0) return 'Closed'
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  if (hours <= 0) return `Closes in ${minutes}m`
  return `Closes in ${hours}h ${minutes}m`
}

function opensLabel(from: string) {
  const ms = new Date(from).getTime() - Date.now()
  if (ms <= 0) return 'Opens now'
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  if (hours <= 0) return `Opens in ${minutes}m`
  return `Opens in ${hours}h ${minutes}m`
}

export default function ExamsPage() {
  const { user } = useAuth()
  const [exams, setExams] = useState<ExamSummary[]>([])
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([listAvailableExams(), getDashboardSummary().catch(() => null)])
      .then(([items, summaryData]) => {
        if (cancelled) return
        setExams(items)
        setSummary(summaryData)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load exams')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(
    () => ({
      all: summary?.examCounts.all ?? exams.length,
      available:
        summary?.examCounts.available ??
        exams.filter(
          (exam) => exam.availability === 'available' && exam.attemptStatus !== 'submitted',
        ).length,
      upcoming:
        summary?.examCounts.upcoming ??
        exams.filter((exam) => exam.availability === 'upcoming').length,
      completed:
        summary?.examCounts.completed ??
        exams.filter((exam) => exam.attemptStatus === 'submitted').length,
    }),
    [exams, summary],
  )

  const visible = useMemo(() => {
    if (filter === 'completed') {
      return exams.filter((exam) => exam.attemptStatus === 'submitted')
    }
    if (filter === 'available') {
      return exams.filter(
        (exam) => exam.availability === 'available' && exam.attemptStatus !== 'submitted',
      )
    }
    if (filter === 'upcoming') return exams.filter((exam) => exam.availability === 'upcoming')
    return exams
  }, [exams, filter])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-[#df2428]" />
            Welcome, {user?.name || 'Student'}
          </span>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#0f1115] sm:text-4xl">
            Available exams
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Start an exam only when your device is ready. System checks will run again before the
            test opens.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0f1115] shadow-soft"
          >
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <Link
            to="/system-check"
            className="inline-flex items-center gap-2 rounded-full bg-[#df2428] px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-[#c51f23]"
          >
            <ShieldCheck className="h-4 w-4" />
            Run system check
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-full border border-gray-200 bg-white p-1.5 shadow-soft">
        {(
          [
            ['all', 'All'],
            ['available', 'Available'],
            ['upcoming', 'Upcoming'],
            ['completed', 'Completed'],
          ] as const
        ).map(([key, label]) => {
          const active = filter === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                active
                  ? 'bg-[#0f1115] text-white'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-[#0f1115]'
              }`}
            >
              {label}
              <span
                className={`rounded-full px-1.5 text-[11px] font-bold ${
                  active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {counts[key]}
              </span>
            </button>
          )
        })}
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="space-y-3">
        {loading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
            Loading exams…
          </div>
        ) : null}

        {!loading && filter === 'completed' && visible.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            No completed exams yet. Submitted attempts also appear in{' '}
            <Link to="/history" className="font-semibold text-[#df2428]">
              History
            </Link>
            .
          </div>
        ) : null}

        {!loading && filter !== 'completed' && visible.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            No exams in this filter right now.
          </div>
        ) : null}

        {visible.map((exam, index) => {
          const isSubmitted = exam.attemptStatus === 'submitted'
          const isInProgress = exam.attemptStatus === 'in_progress'
          const canStart = exam.availability === 'available' && !isSubmitted
          return (
            <article
              key={exam.id}
              className="relative overflow-hidden rounded-[28px] border border-gray-200 bg-white p-5 shadow-soft sm:p-6"
            >
              {index === 0 && canStart ? (
                <span className="absolute bottom-5 left-0 top-5 w-1 rounded-r-full bg-[#df2428]" />
              ) : null}
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 pl-2">
                  <p className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    <span>{exam.questionCount} questions</span>
                    {(exam.codingCount ?? 0) > 0 ? (
                      <span className="rounded-full bg-[#111318] px-2 py-0.5 text-white">
                        {exam.codingCount} coding
                      </span>
                    ) : null}
                    <span>
                      {exam.durationMinutes ?? Math.round(exam.durationSeconds / 60)} minutes
                    </span>
                    <span>{exam.totalMarks} marks</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                      {isSubmitted
                        ? 'completed'
                        : isInProgress
                          ? 'in progress'
                          : exam.availability ?? 'published'}
                    </span>
                  </p>
                  <h2 className="mt-2 text-xl font-extrabold tracking-tight text-[#0f1115] sm:text-2xl">
                    {exam.title}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">
                    {exam.description ||
                      'Proctored exam with focus lock, camera monitoring and timed auto-submit.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-gray-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5" />
                      {isSubmitted
                        ? 'Already submitted'
                        : exam.availability === 'upcoming'
                          ? opensLabel(exam.availableFrom)
                          : closesLabel(exam.availableUntil)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Proctored · Focus lock
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Timer className="h-3.5 w-3.5" />
                      Auto-submit at time out
                    </span>
                  </div>
                </div>
                {isSubmitted ? (
                  <Link
                    to="/history"
                    className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full border border-gray-200 bg-gray-50 px-5 py-3 text-sm font-bold uppercase tracking-wide text-gray-700 transition hover:bg-gray-100 lg:self-center"
                  >
                    View history
                  </Link>
                ) : canStart && isInProgress && exam.attemptId ? (
                  <Link
                    to={`/exams/${exam.id}/take?attemptId=${exam.attemptId}`}
                    className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full bg-[#df2428] px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#c51f23] lg:self-center"
                  >
                    Resume exam <ArrowUpRight className="h-4 w-4" />
                  </Link>
                ) : canStart ? (
                  <Link
                    to={`/exams/${exam.id}/start`}
                    className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full bg-[#df2428] px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#c51f23] lg:self-center"
                  >
                    Start exam <ArrowUpRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="inline-flex shrink-0 items-center justify-center self-start rounded-full border border-gray-200 bg-gray-50 px-5 py-3 text-sm font-bold uppercase tracking-wide text-gray-500 lg:self-center">
                    {exam.availability === 'upcoming' ? 'Upcoming' : 'Closed'}
                  </span>
                )}
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
