import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Clock3,
  Flame,
  ShieldCheck,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getDashboardSummary, listAvailableExams } from '@/lib/exams/api'
import type { DashboardSummary, ExamSummary } from '@/lib/exams/types'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDuration(totalSeconds: number | null) {
  if (totalSeconds == null) return '—'
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function closesInLabel(until: string) {
  const ms = new Date(until).getTime() - Date.now()
  if (ms <= 0) return 'Window closing soon'
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  const seconds = Math.floor((ms % 60_000) / 1000)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function dayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long' })
}

function relativeTime(iso: string | null) {
  if (!iso) return 'Recently'
  const delta = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(delta / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [exams, setExams] = useState<ExamSummary[]>([])
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nowTick, setNowTick] = useState(0)
  const [chartMode, setChartMode] = useState<'score' | 'time' | 'accuracy'>('score')

  const displayName = user?.fullName || user?.name || 'Student'
  const shortName = displayName.split(/\s+/)[0] || 'Student'
  const studentCode = useMemo(() => {
    const seed = (user?.id || user?.email || '0000').replace(/\D/g, '').slice(-4).padStart(4, '0')
    return `Student ${seed}`
  }, [user?.email, user?.id])
  const cohort = user?.cohortName || user?.programName || null

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([listAvailableExams(), getDashboardSummary()])
      .then(([examItems, summaryData]) => {
        if (cancelled) return
        setExams(examItems)
        setSummary(summaryData)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load dashboard')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const availableExams = exams.filter((exam) => exam.availability === 'available')
  const featured = availableExams[0] ?? null
  const readiness = summary?.avgScore
  const trajectory = summary?.trajectory ?? []
  const maxDuration = Math.max(
    1,
    ...trajectory.map((item) => item.durationSeconds ?? 0),
  )
  const chartValues =
    chartMode === 'time'
      ? trajectory.map((item) =>
          item.durationSeconds == null
            ? 0
            : Math.round((item.durationSeconds / maxDuration) * 100),
        )
      : trajectory.map((item) => item.scorePercent)

  const chartPoints =
    chartValues.length > 1
      ? chartValues
          .map((value, index) => {
            const x = (index / Math.max(1, chartValues.length - 1)) * 100
            const y = 100 - Math.min(100, Math.max(0, value))
            return `${x},${y}`
          })
          .join(' ')
      : ''

  void nowTick

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-[#df2428]" />
            {dayLabel()}
            {cohort ? ` · Cohort ${cohort}` : ''}
          </span>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold tracking-tight text-[#0f1115] sm:text-4xl">
            {greeting()}, {studentCode}.
          </h1>
          <p className="mt-2 text-sm text-gray-500">Welcome back, {shortName}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/exams"
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0f1115] shadow-soft transition hover:bg-gray-50"
          >
            All exams <ArrowUpRight className="h-4 w-4" />
          </Link>
          {featured ? (
            <Link
              to={`/exams/${featured.id}/start`}
              className="inline-flex items-center gap-2 rounded-full bg-[#df2428] px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-[#c51f23]"
            >
              Resume next exam <Zap className="h-4 w-4" fill="currentColor" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-400">
              No exam ready <Zap className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">
        <section className="relative overflow-hidden rounded-[28px] bg-[#12141a] p-5 text-white shadow-card sm:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(223,36,40,0.35),transparent_42%)]" />
          <div className="pointer-events-none absolute inset-0 dashboard-grid-bg opacity-40" />
          <div className="relative">
            {loading ? (
              <p className="text-sm text-white/60">Loading your next exam…</p>
            ) : featured ? (
              <>
                <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/75">
                  Next in your queue · window closes in {closesInLabel(featured.availableUntil)}
                </span>
                <h2 className="mt-4 max-w-xl text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {featured.title}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
                  {featured.description || 'Secure proctored exam with focus lock.'}
                </p>
                <div className="mt-6 grid grid-cols-3 gap-3 border-y border-white/10 py-4">
                  <div>
                    <p className="text-2xl font-extrabold">{featured.questionCount}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
                      Questions
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold">
                      {featured.durationMinutes ?? Math.round(featured.durationSeconds / 60)}
                    </p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
                      min Duration
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold">{featured.totalMarks}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
                      Marks
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    to={`/exams/${featured.id}/start`}
                    className="inline-flex items-center gap-2 rounded-full bg-[#df2428] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#c51f23]"
                  >
                    Start exam <ArrowUpRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/system-check"
                    className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Run system check
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-extrabold">No exam in queue</h2>
                <p className="mt-2 text-sm text-white/60">
                  When an exam becomes available from the database, it will appear here.
                </p>
              </>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-card sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-500">Readiness score</p>
              <p className="mt-1 text-3xl font-extrabold text-[#0f1115]">
                {readiness == null ? '—' : readiness}
                <span className="text-lg text-gray-400">/100</span>
              </p>
            </div>
            <span className="rounded-full bg-[#ffe8e9] px-2.5 py-1 text-[11px] font-bold text-[#df2428]">
              {summary?.weeklyDelta == null
                ? 'No weekly delta yet'
                : `${summary.weeklyDelta > 0 ? '+' : ''}${summary.weeklyDelta} this week`}
            </span>
          </div>

          <div className="mt-5 flex items-center gap-4">
            <div
              className="relative h-24 w-24 shrink-0 rounded-full"
              style={{
                background: `conic-gradient(#df2428 ${(readiness ?? 0) * 3.6}deg, #f1f1f1 0deg)`,
              }}
            >
              <div className="absolute inset-[10px] rounded-full bg-white" />
            </div>
            <p className="text-sm leading-relaxed text-gray-500">
              {summary?.submittedCount
                ? `Based on ${summary.submittedCount} submitted attempt${summary.submittedCount === 1 ? '' : 's'} from your account.`
                : 'Submit an exam to unlock your readiness score from live results.'}
              {cohort ? (
                <>
                  {' '}
                  Cohort <span className="font-semibold text-[#0f1115]">{cohort}</span>.
                </>
              ) : null}
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {trajectory.length === 0 ? (
              <p className="rounded-2xl bg-gray-50 px-3 py-3 text-xs text-gray-500">
                Subject breakdown appears after you have scored attempts in history.
              </p>
            ) : (
              trajectory
                .slice(-3)
                .reverse()
                .map((item) => (
                  <div key={`${item.examId}-${item.label}`}>
                    <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="text-[#0f1115]">{item.scorePercent}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-[#df2428]"
                        style={{ width: `${item.scorePercent}%` }}
                      />
                    </div>
                  </div>
                ))
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Focus streak',
            value: summary ? `${summary.focusStreak} day${summary.focusStreak === 1 ? '' : 's'}` : '—',
            icon: Flame,
            hint: 'Consecutive submission days',
          },
          {
            label: 'Avg attempt time',
            value: formatDuration(summary?.avgAttemptSeconds ?? null),
            icon: Timer,
            hint: 'From submitted attempts',
          },
          {
            label: 'Rank in cohort',
            value:
              summary?.cohortRank != null
                ? `#${summary.cohortRank}${summary.cohortSize ? ` / ${summary.cohortSize}` : ''}`
                : '—',
            icon: Trophy,
            hint: 'Among users with submissions',
          },
          {
            label: 'Integrity score',
            value: summary?.integrityScore == null ? '—' : `${summary.integrityScore}%`,
            icon: ShieldCheck,
            hint: 'From proctoring events',
          },
        ].map((card) => (
          <article
            key={card.label}
            className="rounded-3xl border border-gray-200 bg-white p-4 shadow-soft"
          >
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                {card.label}
              </p>
              <span className="rounded-full bg-[#ffe8e9] p-2 text-[#df2428]">
                <card.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-[#0f1115]">{card.value}</p>
            <p className="mt-1 text-xs text-gray-500">{card.hint}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
        <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Performance trajectory
              </p>
              <h3 className="mt-1 text-xl font-extrabold text-[#0f1115]">
                {trajectory.length ? `Last ${trajectory.length} submitted` : 'No submissions yet'}
              </h3>
            </div>
            <div className="inline-flex rounded-full bg-gray-100 p-1 text-xs font-semibold">
              {(
                [
                  ['score', 'Score'],
                  ['time', 'Time'],
                  ['accuracy', 'Accuracy'],
                ] as const
              ).map(([key, label]) => {
                const active = chartMode === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setChartMode(key)}
                    className={`rounded-full px-3 py-1.5 transition ${
                      active
                        ? 'bg-[#df2428] text-white'
                        : 'text-gray-600 hover:text-[#0f1115]'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="mt-5 h-44">
            {chartValues.length > 1 ? (
              <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" preserveAspectRatio="none">
                {[25, 50, 75].map((y) => (
                  <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#eee" strokeWidth="0.4" />
                ))}
                <polyline
                  fill="none"
                  stroke="#df2428"
                  strokeWidth="1.8"
                  points={chartPoints}
                  vectorEffect="non-scaling-stroke"
                />
                {chartValues.map((value, index) => {
                  const x = (index / Math.max(1, chartValues.length - 1)) * 100
                  const y = 100 - Math.min(100, Math.max(0, value))
                  return <circle key={index} cx={x} cy={y} r="1.6" fill="#df2428" />
                })}
              </svg>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl bg-gray-50 text-sm text-gray-500">
                Submit at least two exams to plot trajectory from the database.
              </div>
            )}
          </div>
          {trajectory.length > 0 ? (
            <div className="mt-2 flex justify-between text-[10px] font-semibold text-gray-400">
              {trajectory.map((item) => (
                <span key={item.label}>{item.label}</span>
              ))}
            </div>
          ) : null}
        </section>

        <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-card sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-[#0f1115]">Recent activity</h3>
            <Link to="/history" className="text-sm font-semibold text-[#df2428]">
              View all
            </Link>
          </div>
          <ul className="mt-5 space-y-0">
            {summary?.activity?.length ? (
              summary.activity.map((item, index) => (
                <li key={`${item.title}-${index}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-1 h-2.5 w-2.5 rounded-full ${
                        index === 0 ? 'bg-[#df2428]' : 'border-2 border-gray-300 bg-white'
                      }`}
                    />
                    {index < summary.activity.length - 1 ? (
                      <span className="my-1 w-px flex-1 bg-gray-200" />
                    ) : null}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-bold text-[#0f1115]">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.detail}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                      <Clock3 className="h-3 w-3" />
                      {item.at ? relativeTime(item.at) : 'Recently'}
                    </p>
                  </div>
                </li>
              ))
            ) : (
              <li className="rounded-2xl bg-gray-50 px-3 py-4 text-sm text-gray-500">
                {availableExams.length
                  ? `${availableExams.length} exam${availableExams.length === 1 ? '' : 's'} available — activity appears after submissions.`
                  : 'No recent activity yet. Synced exams and submissions will show here.'}
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}
