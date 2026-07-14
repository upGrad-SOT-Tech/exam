import { request } from "@/lib/api"
import type { Exam, ExamAttempt, ExamSubmission, ExamSummary } from "./types"

export async function listAvailableExams(): Promise<ExamSummary[]> {
  const data = await request<{ exams: ExamSummary[] }>("/api/exams")
  return data.exams
}

export async function getExam(examId: string): Promise<Exam> {
  const data = await request<{ exam: Exam }>(`/api/exams/${examId}`)
  return data.exam
}

export async function startExamAttempt(examId: string): Promise<ExamAttempt> {
  const data = await request<{ attempt: ExamAttempt }>(`/api/exams/${examId}/attempts`, {
    method: "POST",
    body: "{}",
  })
  return data.attempt
}

export async function logPreExamEvent(
  examId: string,
  event: { type: string; occurredAt?: string; details?: Record<string, unknown> },
): Promise<void> {
  await request(`/api/exams/${examId}/events`, {
    method: "POST",
    body: JSON.stringify({
      type: event.type,
      occurredAt: event.occurredAt ?? new Date().toISOString(),
      details: event.details ?? {},
    }),
  })
}

export async function saveExamAnswer(
  attemptId: string,
  questionId: string,
  answerIndex: number,
): Promise<void> {
  await request(`/api/exams/attempts/${attemptId}/answers`, {
    method: "PATCH",
    body: JSON.stringify({ questionId, answerIndex }),
  })
}

export async function submitExamAttempt(attemptId: string): Promise<ExamSubmission> {
  const data = await request<{ submission: ExamSubmission }>(
    `/api/exams/attempts/${attemptId}/submit`,
    {
      method: "POST",
      body: "{}",
    },
  )
  return data.submission
}

export async function submitProctorEvent(
  attemptId: string,
  event: { type: string; occurredAt: string; details?: Record<string, unknown> },
): Promise<void> {
  await request(`/api/exams/attempts/${attemptId}/events`, {
    method: "POST",
    body: JSON.stringify(event),
  })
}

export async function submitProctorEvents(
  attemptId: string,
  events: Array<{ type: string; occurredAt: string; details?: Record<string, unknown> }>,
): Promise<void> {
  if (events.length === 0) return
  await request(`/api/exams/attempts/${attemptId}/events/bulk`, {
    method: "POST",
    body: JSON.stringify({ events }),
  })
}
