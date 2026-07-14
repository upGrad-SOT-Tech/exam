export type ExamQuestion = {
  id: string
  sequence: number
  text: string
  options: string[]
  marks: number
}

export type Exam = {
  id: string
  title: string
  description: string
  durationSeconds: number
  durationMinutes?: number
  totalMarks: number
  availableFrom: string
  availableUntil: string
  status: "published" | "available" | "upcoming" | "closed"
  questionCount: number
  questions: ExamQuestion[]
}

export type ExamSummary = Omit<Exam, "questions"> & {
  questionCount: number
}

export type ExamAnswerMap = Record<string, number>

export type ExamAttempt = {
  id: string
  examId: string
  status: "in_progress" | "submitted"
  startedAt: string
  durationSeconds: number
}

export type ExamSubmission = {
  attemptId: string
  score: number
  totalMarks: number
  submittedAt: string
}
