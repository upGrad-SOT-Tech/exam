import { useAuth } from "@/context/AuthContext";
import { logoUrl } from "@/assets/brand";
import { listAvailableExams } from "@/lib/exams/api";
import type { ExamSummary } from "@/lib/exams/types";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function HomePage() {
  const { user, logout } = useAuth();
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAvailableExams()
      .then((items) => {
        if (!cancelled) setExams(items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load exams");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <img
            src={logoUrl}
            alt="upGrad School of Technology"
            className="h-10 w-auto"
          />
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-md bg-[#df2428] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c91f23]"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="border border-gray-200 bg-white px-5 py-5">
          <p className="text-sm text-gray-600">Welcome, {user?.name || "Student"}</p>
          <h1 className="mt-1 text-3xl font-extrabold text-[#df2428]">Available exams</h1>
          <p className="mt-2 text-sm text-gray-700">
            Start an exam only when your device is ready. System checks will run again before the test opens.
          </p>
        </div>

        <section className="mt-5 grid gap-4">
          {loading ? (
            <div className="border border-gray-200 bg-white p-5 text-sm text-gray-700">Loading exams…</div>
          ) : null}
          {error ? (
            <div className="border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
          ) : null}
          {exams.map((exam) => (
            <article key={exam.id} className="border border-gray-200 bg-white p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {exam.questionCount} questions · {exam.durationMinutes} minutes · {exam.totalMarks} marks
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-gray-900">{exam.title}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-gray-700">{exam.description}</p>
                </div>
                <Link
                  to={`/exams/${exam.id}/start`}
                  className="inline-flex items-center justify-center rounded-md bg-[#df2428] px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#c91f23]"
                >
                  Start exam
                </Link>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
