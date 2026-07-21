export type ExamQuestionType = "MCQ" | "CODING"

export type CodingSample = {
  input?: string
  output?: string
  explanation?: string
}

export type ExamQuestion = {
  id: string
  sequence: number
  text: string
  type?: ExamQuestionType
  options: string[]
  marks: number
  language?: string
  starterCode?: string
  samples?: CodingSample[]
  constraints?: string
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
  codingCount?: number
  questions: ExamQuestion[]
  attemptStatus?: "in_progress" | "submitted" | null
  attemptId?: string | null
}

export type ExamSummary = Omit<Exam, "questions"> & {
  questionCount: number
  codingCount?: number
  availability?: "available" | "upcoming" | "closed"
  attemptStatus?: "in_progress" | "submitted" | null
  attemptId?: string | null
}

export type ExamAnswerMap = Record<string, number | string>

export type ExamAttempt = {
  id: string
  examId: string
  status: "in_progress" | "submitted"
  startedAt: string
  durationSeconds: number
}

export type ExamSubmission = {
  attemptId: string
  score: number | null
  totalMarks: number
  submittedAt: string
  resultsReleased?: boolean
}

export type ExamHistoryItem = {
  attemptId: string
  examId: string
  examTitle: string
  score: number | null
  totalMarks: number
  submittedAt: string | null
  durationSeconds: number
  integrity: "clean" | "flagged"
  resultsReleased?: boolean
}

export type DashboardSummary = {
  avgScore: number | null
  weeklyDelta: number | null
  avgAttemptSeconds: number | null
  focusStreak: number
  cohortRank: number | null
  cohortSize: number
  integrityScore: number | null
  submittedCount: number
  trajectory: Array<{
    label: string
    scorePercent: number
    durationSeconds: number | null
    examTitle: string
    submittedAt: string | null
    examId: string
  }>
  activity: Array<{
    type: string
    title: string
    detail: string
    at: string | null
  }>
  examCounts: {
    all: number
    available: number
    upcoming: number
    completed: number
  }
}
