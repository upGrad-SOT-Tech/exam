import { useEffect, useRef, useState } from 'react'
import { Code2, Terminal } from 'lucide-react'
import type { ExamQuestion } from '@/lib/exams/types'

type Props = {
  question: ExamQuestion
  value: string
  onChange: (code: string) => void
}

export default function CodingQuestionPanel({ question, value, onChange }: Props) {
  const [activeSample, setActiveSample] = useState(0)
  const saveHintRef = useRef<number | null>(null)
  const [savedHint, setSavedHint] = useState(false)
  const samples = question.samples || []

  useEffect(() => {
    setActiveSample(0)
  }, [question.id])

  useEffect(() => {
    return () => {
      if (saveHintRef.current) window.clearTimeout(saveHintRef.current)
    }
  }, [])

  const markSaved = () => {
    setSavedHint(true)
    if (saveHintRef.current) window.clearTimeout(saveHintRef.current)
    saveHintRef.current = window.setTimeout(() => setSavedHint(false), 1200)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-[#111318] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          <Code2 className="h-3.5 w-3.5 text-[#df2428]" />
          Coding
        </span>
        <span className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
          {question.language || 'python'}
        </span>
        <span className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600">
          {question.marks} mark{question.marks === 1 ? '' : 's'}
        </span>
        {savedHint ? (
          <span className="text-[11px] font-semibold text-emerald-600">Saved</span>
        ) : null}
      </div>

      <div className="border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Problem</p>
          <h2 className="mt-2 whitespace-pre-wrap text-lg font-bold leading-relaxed text-gray-900">
            {question.text}
          </h2>
          {question.constraints ? (
            <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600">
              <span className="font-semibold text-gray-800">Constraints: </span>
              {question.constraints}
            </p>
          ) : null}
        </div>

        {samples.length > 0 ? (
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Sample cases
              </p>
              <div className="flex gap-1">
                {samples.map((_, index) => (
                  <button
                    key={`sample-${index}`}
                    type="button"
                    onClick={() => setActiveSample(index)}
                    className={`h-7 min-w-7 rounded-md px-2 text-xs font-bold ${
                      activeSample === index
                        ? 'bg-[#df2428] text-white'
                        : 'border border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="border border-gray-200 bg-[#0f1115] p-3">
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/55">
                  <Terminal className="h-3 w-3" />
                  Input
                </p>
                <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-5 text-emerald-300">
                  {samples[activeSample]?.input || '—'}
                </pre>
              </div>
              <div className="border border-gray-200 bg-[#0f1115] p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-white/55">
                  Output
                </p>
                <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-5 text-sky-300">
                  {samples[activeSample]?.output || '—'}
                </pre>
              </div>
            </div>
            {samples[activeSample]?.explanation ? (
              <p className="mt-3 text-sm text-gray-600">{samples[activeSample].explanation}</p>
            ) : null}
          </div>
        ) : null}

        <div className="px-5 py-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Your solution
            </p>
            <p className="text-[11px] text-gray-500">Autosaves as you type · judge runs later</p>
          </div>
          <div className="overflow-hidden border border-gray-800 bg-[#111318] shadow-sm">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
                editor · {question.language || 'python'}
              </span>
              <span className="text-[11px] text-white/35">{value.length.toLocaleString()} chars</span>
            </div>
            <textarea
              value={value}
              spellCheck={false}
              onChange={(event) => {
                onChange(event.target.value)
                markSaved()
              }}
              className="min-h-[320px] w-full resize-y bg-transparent px-4 py-3 font-mono text-[13px] leading-6 text-[#e8eaed] outline-none"
              placeholder="// Write your solution here"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
