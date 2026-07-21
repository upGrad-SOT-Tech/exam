const questions = Array.from({ length: 50 }, (_, index) => {
  const number = index + 1;
  const base = [
    {
      text: "Which data structure follows First In First Out order?",
      options: ["Stack", "Queue", "Tree", "Graph"],
      answerIndex: 1,
    },
    {
      text: "Which protocol is used to securely browse websites?",
      options: ["FTP", "HTTP", "HTTPS", "SMTP"],
      answerIndex: 2,
    },
    {
      text: "Which Electron process controls native windows?",
      options: ["Main process", "Renderer process", "Service worker", "CSS engine"],
      answerIndex: 0,
    },
    {
      text: "Which one is used for real-time bidirectional communication?",
      options: ["WebSocket", "CSV", "PNG", "SMTP"],
      answerIndex: 0,
    },
    {
      text: "Which principle keeps exam platform data separate from LMS data?",
      options: ["Bounded context", "Inline styling", "Manual refresh", "Single file storage"],
      answerIndex: 0,
    },
  ][index % 5];

  return {
    id: `q${String(number).padStart(3, "0")}`,
    sequence: number,
    marks: 1,
    ...base,
  };
});

export async function seedDefaultExam(examDb) {
  const exams = examDb.collection("exams");
  const existing = await exams.findOne({ slug: "technology-foundation-readiness-v2" });
  if (existing) return;

  await exams.insertOne({
    slug: "technology-foundation-readiness-v2",
    title: "Technology Foundation Readiness Test 2",
    description: "A fresh 50-question secure mock exam seeded into exam_app.",
    durationSeconds: 60 * 60,
    totalMarks: 50,
    status: "published",
    availableFrom: new Date("2026-07-10T00:00:00.000Z"),
    availableUntil: new Date("2026-12-31T23:59:59.000Z"),
    questions,
    targeting: {
      mode: "all",
      campuses: [],
      cohortIds: [],
      programs: [],
      batches: [],
      studentIds: [],
      studentEmails: [],
    },
    resultsReleased: true,
    resultsReleasedAt: new Date(),
    settings: {
      shuffleQuestions: false,
      shuffleOptions: false,
      allowReview: true,
      proctoringRequired: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
