import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Mail, MapPin, ShieldCheck, School } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getDashboardSummary, listAvailableExams } from '@/lib/exams/api'
import type { DashboardSummary, ExamSummary } from '@/lib/exams/types'

export default function ProfilePage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [availableCount, setAvailableCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const displayName = user?.fullName || user?.name || 'Student'
  const initials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return 'ST'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }, [displayName])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getDashboardSummary(), listAvailableExams()])
      .then(([summaryData, exams]: [DashboardSummary, ExamSummary[]]) => {
        if (cancelled) return
        setSummary(summaryData)
        setAvailableCount(exams.filter((exam) => exam.availability === 'available').length)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load profile')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const streak = summary?.focusStreak ?? 0
  const avgScore = summary?.avgScore
  const examAttempts = summary?.submittedCount ?? 0
  const trajectory = summary?.trajectory ?? []
  const integrity = summary?.integrityScore

  const recentScores = [...trajectory].reverse().slice(0, 4)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-[#df2428]" />
            Candidate profile
          </span>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#0f1115] sm:text-4xl">
            {displayName.split(/\s+/).slice(0, 2).join(' ')}
          </h1>
        </div>
        <Link
          to="/system-check"
          className="inline-flex items-center gap-2 self-start rounded-full bg-[#df2428] px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-[#c51f23]"
        >
          <ShieldCheck className="h-4 w-4" />
          Verify identity
        </Link>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.7fr)]">
        <section className="relative overflow-hidden rounded-[28px] bg-[#12141a] p-6 text-white shadow-card">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(223,36,40,0.35),transparent_45%)]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-[#df2428] text-2xl font-extrabold text-white">
                {initials}
              </div>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#0f1115]">
                Verified
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-extrabold">{displayName}</h2>
              <p className="mt-1 text-sm text-white/55">
                {[user?.programName, user?.cohortName].filter(Boolean).join(' · ') ||
                  'Program details linked from LMS account'}
              </p>
              <div className="mt-4 space-y-2 text-sm text-white/70">
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-white/40" />
                  {user?.email || '—'}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-white/40" />
                  {user?.campus || 'Campus not set on account'}
                </p>
                <p className="flex items-center gap-2">
                  <School className="h-4 w-4 text-white/40" />
                  {user?.cohortId || user?.id || 'Secure exam candidate'}
                </p>
              </div>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-3 gap-3 rounded-2xl bg-white/5 px-4 py-4">
            <div>
              <p className="text-xl font-extrabold">{loading ? '…' : examAttempts}</p>
              <p className="text-[11px] text-white/45">Submitted</p>
            </div>
            <div>
              <p className="text-xl font-extrabold">
                {loading ? '…' : avgScore == null ? '—' : `${avgScore}%`}
              </p>
              <p className="text-[11px] text-white/45">Avg score</p>
            </div>
            <div>
              <p className="text-xl font-extrabold">{loading ? '…' : `${streak}d`}</p>
              <p className="text-[11px] text-white/45">Streak</p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-[#0f1115]">Focus streak</h3>
            <span className="rounded-full bg-[#ffe8e9] p-2 text-[#df2428]">
              <Flame className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-[#0f1115]">
            {loading ? '…' : streak} day{streak === 1 ? '' : 's'}
          </p>
          <p className="mt-1 text-xs text-gray-500">Consecutive days with a submitted attempt</p>
          <div className="mt-5 flex gap-1.5">
            {Array.from({ length: 14 }, (_, index) => {
              const active = streak > 0 && index >= 14 - Math.min(14, streak)
              return (
                <span
                  key={index}
                  className={`h-8 flex-1 rounded-md ${active ? 'bg-[#df2428]' : 'bg-[#ffe8e9]'}`}
                />
              )
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-card sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-extrabold text-[#0f1115]">Recent exam scores</h3>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500">
              From history
            </span>
          </div>
          {recentScores.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-gray-50 px-3 py-4 text-sm text-gray-500">
              Submit exams to see score breakdown here.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {recentScores.map((item) => (
                <div key={`${item.examId}-${item.label}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-[#0f1115]">{item.examTitle}</p>
                    <span className="text-xs font-bold text-[#0f1115]">{item.scorePercent}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-[#df2428]"
                      style={{ width: `${item.scorePercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-card sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-[#0f1115]">Integrity & queue</h3>
            <Link to="/history" className="text-xs font-semibold text-[#df2428]">
              View history
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Integrity
              </p>
              <p className="mt-2 text-2xl font-extrabold text-[#0f1115]">
                {integrity == null ? '—' : `${integrity}%`}
              </p>
              <p className="mt-1 text-xs text-gray-500">From proctor events</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Available now
              </p>
              <p className="mt-2 text-2xl font-extrabold text-[#0f1115]">{availableCount}</p>
              <p className="mt-1 text-xs text-gray-500">Live published exams</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Cohort rank
              </p>
              <p className="mt-2 text-2xl font-extrabold text-[#0f1115]">
                {summary?.cohortRank == null
                  ? '—'
                  : `#${summary.cohortRank}${summary.cohortSize ? ` / ${summary.cohortSize}` : ''}`}
              </p>
              <p className="mt-1 text-xs text-gray-500">Among submitters</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Weekly delta
              </p>
              <p className="mt-2 text-2xl font-extrabold text-[#0f1115]">
                {summary?.weeklyDelta == null
                  ? '—'
                  : `${summary.weeklyDelta > 0 ? '+' : ''}${summary.weeklyDelta}`}
              </p>
              <p className="mt-1 text-xs text-gray-500">Avg score change</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
