import { ObjectId } from "mongodb";
import { Router } from "express";
import { z } from "zod";
import { getExamDb, getLmsDb } from "../../db/mongo.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { AppError } from "../../shared/errors.js";
import { studentMatchesTargeting } from "./exam.targeting.js";

const router = Router();

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i);
const answerSchema = z
  .object({
    questionId: z.string().min(1),
    answerIndex: z.number().int().min(0).optional(),
    codeAnswer: z.string().max(200_000).optional(),
    language: z.string().max(40).optional(),
  })
  .refine((data) => data.answerIndex != null || data.codeAnswer != null, {
    message: "answerIndex or codeAnswer required",
  });
const eventSchema = z.object({
  type: z.string().min(1),
  occurredAt: z.string().datetime().optional(),
  details: z.record(z.unknown()).optional(),
});
const eventListSchema = z.object({
  events: z.array(eventSchema).min(1).max(100),
});

function exams() {
  return getExamDb().collection("exams");
}

function attempts() {
  return getExamDb().collection("attempts");
}

function answers() {
  return getExamDb().collection("attempt_answers");
}

function events() {
  return getExamDb().collection("proctor_events");
}

function preExamEvents() {
  return getExamDb().collection("pre_exam_events");
}

function publicExam(exam, now = new Date(), attempt = null) {
  const availableFrom = new Date(exam.availableFrom);
  const availableUntil = new Date(exam.availableUntil);
  let availability = "closed";
  if (availableFrom > now) availability = "upcoming";
  else if (availableUntil >= now) availability = "available";

  return {
    id: String(exam._id),
    title: exam.title,
    description: exam.description,
    durationSeconds: exam.durationSeconds,
    durationMinutes: Math.round(exam.durationSeconds / 60),
    totalMarks: exam.totalMarks,
    availableFrom: exam.availableFrom,
    availableUntil: exam.availableUntil,
    status: exam.status,
    availability,
    questionCount: exam.questions.length,
    codingCount: (exam.questions || []).filter((q) => q.type === "CODING").length,
    resultsReleased: Boolean(exam.resultsReleased),
    attemptStatus: attempt?.status === "submitted" || attempt?.status === "in_progress" ? attempt.status : null,
    attemptId: attempt?._id ? String(attempt._id) : null,
  };
}

async function loadAttemptsByExamId(userId, examObjectIds) {
  if (!userId || examObjectIds.length === 0) return new Map();

  const items = await attempts()
    .find({
      userId,
      examId: { $in: examObjectIds },
      status: { $in: ["in_progress", "submitted"] },
    })
    .toArray();

  const byExamId = new Map();
  for (const item of items) {
    const key = String(item.examId);
    const existing = byExamId.get(key);
    // Prefer submitted if both somehow exist.
    if (!existing || item.status === "submitted") {
      byExamId.set(key, item);
    }
  }
  return byExamId;
}

async function loadStudentAudience(user) {
  if (!user?.sub) return null;
  const email =
    user.email != null ? String(user.email).trim().toLowerCase() : null;

  const query = ObjectId.isValid(user.sub)
    ? { _id: new ObjectId(user.sub) }
    : { email: email || user.email };

  const doc =
    (await getLmsDb().collection("students").findOne(query)) ||
    (await getLmsDb().collection("candidates").findOne(query));

  const profile = doc?.profileSnapshot || {};

  // Exam targeting expects cohortId/cohortName, but in some setups the student
  // document doesn't contain it. The enrollment record does.
  let cohortEnrollment = null;
  if (email && (!doc?.cohortId || !doc?.cohortName)) {
    cohortEnrollment = await getLmsDb()
      .collection("lms_cohort_enrollments")
      .findOne({ email });
  }

  const cohortId = doc?.cohortId || profile?.cohortId || cohortEnrollment?.cohortId || null;
  const cohortName = doc?.cohortName || profile?.cohortName || cohortEnrollment?.cohortName || null;

  return {
    id: doc ? String(doc._id) : user.sub,
    email: doc?.email || user.email,
    campus: doc?.campus || profile?.preferredCampus || cohortEnrollment?.campus || null,
    cohortId: cohortId ? String(cohortId) : null,
    cohortName: cohortName || null,
    programName: profile?.programName || doc?.programName || null,
    batch: doc?.batch || profile?.batch || null,
    batchName: doc?.batchName || profile?.batchName || null,
  };
}

async function listVisibleExams(user) {
  const audience = await loadStudentAudience(user);
  const items = await exams().find({ status: "published" }).sort({ availableFrom: 1 }).toArray();
  return items.filter((exam) => studentMatchesTargeting(exam.targeting, audience));
}

function studentExam(exam) {
  return {
    ...publicExam(exam),
    questions: exam.questions.map((question) => {
      const type = question.type === "CODING" ? "CODING" : "MCQ";
      if (type === "CODING") {
        return {
          id: question.id,
          sequence: question.sequence,
          text: question.text,
          type: "CODING",
          marks: question.marks,
          language: question.language || "python",
          starterCode: question.starterCode || "",
          samples: Array.isArray(question.samples) ? question.samples : [],
          constraints: question.constraints || "",
          options: [],
        };
      }
      return {
        id: question.id,
        sequence: question.sequence,
        text: question.text,
        type: "MCQ",
        options: question.options,
        marks: question.marks,
      };
    }),
  };
}

async function getPublishedExamForStudent(id, user) {
  if (!objectIdSchema.safeParse(id).success) {
    throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
  }

  const exam = await exams().findOne({ _id: new ObjectId(id), status: "published" });
  if (!exam) throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");

  const audience = await loadStudentAudience(user);
  if (!studentMatchesTargeting(exam.targeting, audience)) {
    throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
  }
  return exam;
}

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const now = new Date();
    const items = await listVisibleExams(req.user);
    const attemptByExamId = await loadAttemptsByExamId(
      req.user.sub,
      items.map((exam) => exam._id),
    );
    res.json({
      exams: items.map((exam) =>
        publicExam(exam, now, attemptByExamId.get(String(exam._id)) ?? null),
      ),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/attempts/history", async (req, res, next) => {
  try {
    const items = await attempts()
      .find({ userId: req.user.sub, status: "submitted" })
      .sort({ submittedAt: -1 })
      .limit(50)
      .toArray();

    const examIds = [...new Set(items.map((item) => String(item.examId)))].filter((id) =>
      objectIdSchema.safeParse(id).success,
    );
    const examDocs =
      examIds.length === 0
        ? []
        : await exams()
            .find({ _id: { $in: examIds.map((id) => new ObjectId(id)) } })
            .toArray();
    const examById = new Map(examDocs.map((exam) => [String(exam._id), exam]));

    const attemptIds = items.map((item) => item._id);
    const flagEvents =
      attemptIds.length === 0
        ? []
        : await events()
            .find({
              attemptId: { $in: attemptIds },
              type: {
                $in: [
                  "no_face",
                  "multi_face",
                  "phone_detected",
                  "book_detected",
                  "screen_capture_attempted",
                  "screen_recording_detected",
                  "another_app_active",
                  "copy_blocked",
                ],
              },
            })
            .project({ attemptId: 1 })
            .toArray();
    const flaggedAttempts = new Set(flagEvents.map((item) => String(item.attemptId)));

    const history = items.map((item) => {
      const exam = examById.get(String(item.examId));
      const startedAt = item.startedAt ? new Date(item.startedAt) : null;
      const submittedAt = item.submittedAt ? new Date(item.submittedAt) : null;
      const durationSeconds =
        startedAt && submittedAt
          ? Math.max(0, Math.round((submittedAt.getTime() - startedAt.getTime()) / 1000))
          : item.durationSeconds ?? 0;
      const released = Boolean(exam?.resultsReleased);

      return {
        attemptId: String(item._id),
        examId: String(item.examId),
        examTitle: exam?.title ?? "Exam",
        score: released ? item.score ?? 0 : null,
        totalMarks: item.totalMarks ?? exam?.totalMarks ?? 0,
        submittedAt: submittedAt?.toISOString() ?? null,
        durationSeconds,
        integrity: flaggedAttempts.has(String(item._id)) ? "flagged" : "clean",
        resultsReleased: released,
      };
    });

    res.json({ history });
  } catch (err) {
    next(err);
  }
});

router.get("/dashboard/summary", async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const now = new Date();
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    const [mySubmitted, allSubmitted, publishedExams, myAttempts] = await Promise.all([
      attempts().find({ userId, status: "submitted" }).sort({ submittedAt: 1 }).toArray(),
      attempts().find({ status: "submitted" }).project({ userId: 1, score: 1, totalMarks: 1 }).toArray(),
      listVisibleExams(req.user),
      attempts()
        .find({
          userId,
          status: { $in: ["in_progress", "submitted"] },
        })
        .toArray(),
    ]);

    const attemptByExamId = new Map();
    for (const item of myAttempts) {
      const key = String(item.examId);
      const existing = attemptByExamId.get(key);
      if (!existing || item.status === "submitted") {
        attemptByExamId.set(key, item);
      }
    }

    const examDocsById = new Map(publishedExams.map((exam) => [String(exam._id), exam]));
    const releasedSubmitted = mySubmitted.filter((item) =>
      Boolean(examDocsById.get(String(item.examId))?.resultsReleased),
    );

    const pct = (score, total) => (total > 0 ? (score / total) * 100 : 0);

    const myPercents = releasedSubmitted.map((item) => pct(item.score ?? 0, item.totalMarks ?? 0));
    const avgScore =
      myPercents.length > 0
        ? Math.round(myPercents.reduce((sum, value) => sum + value, 0) / myPercents.length)
        : null;

    const recent = releasedSubmitted.filter(
      (item) => item.submittedAt && now - new Date(item.submittedAt) <= weekMs,
    );
    const previous = releasedSubmitted.filter((item) => {
      if (!item.submittedAt) return false;
      const age = now - new Date(item.submittedAt);
      return age > weekMs && age <= weekMs * 2;
    });
    const avgOf = (list) => {
      if (list.length === 0) return null;
      const values = list.map((item) => pct(item.score ?? 0, item.totalMarks ?? 0));
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    };
    const recentAvg = avgOf(recent);
    const previousAvg = avgOf(previous);
    const weeklyDelta =
      recentAvg != null && previousAvg != null ? Math.round((recentAvg - previousAvg) * 10) / 10 : null;

    const durations = mySubmitted
      .map((item) => {
        if (!item.startedAt || !item.submittedAt) return null;
        return Math.max(
          0,
          Math.round((new Date(item.submittedAt) - new Date(item.startedAt)) / 1000),
        );
      })
      .filter((value) => typeof value === "number");
    const avgAttemptSeconds =
      durations.length > 0
        ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
        : null;

    const dayKeys = [
      ...new Set(
        mySubmitted
          .filter((item) => item.submittedAt)
          .map((item) => new Date(item.submittedAt).toISOString().slice(0, 10)),
      ),
    ].sort();
    let focusStreak = 0;
    if (dayKeys.length > 0) {
      const cursor = new Date(`${dayKeys[dayKeys.length - 1]}T12:00:00.000Z`);
      const daySet = new Set(dayKeys);
      while (daySet.has(cursor.toISOString().slice(0, 10))) {
        focusStreak += 1;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      }
    }

    const byUser = new Map();
    for (const item of allSubmitted) {
      const key = String(item.userId);
      const list = byUser.get(key) ?? [];
      list.push(pct(item.score ?? 0, item.totalMarks ?? 0));
      byUser.set(key, list);
    }
    const averages = [...byUser.entries()].map(([id, values]) => ({
      id,
      avg: values.reduce((sum, value) => sum + value, 0) / values.length,
    }));
    averages.sort((a, b) => b.avg - a.avg);
    const rankIndex = averages.findIndex((item) => item.id === String(userId));
    const cohortRank = rankIndex >= 0 ? rankIndex + 1 : null;
    const cohortSize = averages.length;

    const attemptIds = mySubmitted.map((item) => item._id);
    const flagCount =
      attemptIds.length === 0
        ? 0
        : await events().countDocuments({
            attemptId: { $in: attemptIds },
            type: {
              $in: [
                "no_face",
                "multi_face",
                "phone_detected",
                "book_detected",
                "screen_capture_attempted",
                "screen_recording_detected",
                "another_app_active",
              ],
            },
          });
    const integrityScore =
      mySubmitted.length === 0
        ? null
        : Math.max(0, Math.round(100 - (flagCount / Math.max(1, mySubmitted.length)) * 25));

    const examTitleById = new Map(
      publishedExams.map((exam) => [String(exam._id), exam.title]),
    );
    const trajectory = releasedSubmitted.slice(-8).map((item, index) => {
      let durationSeconds = null;
      if (item.startedAt && item.submittedAt) {
        durationSeconds = Math.max(
          0,
          Math.round((new Date(item.submittedAt) - new Date(item.startedAt)) / 1000),
        );
      }
      return {
        label: `M${String(index + 1).padStart(2, "0")}`,
        scorePercent: Math.round(pct(item.score ?? 0, item.totalMarks ?? 0)),
        durationSeconds,
        examTitle: examTitleById.get(String(item.examId)) ?? "Exam",
        submittedAt: item.submittedAt ? new Date(item.submittedAt).toISOString() : null,
        examId: String(item.examId),
      };
    });

    const examAvailability = publishedExams.map((exam) =>
      publicExam(exam, now, attemptByExamId.get(String(exam._id)) ?? null),
    );
    const startable = examAvailability.filter(
      (item) => item.availability === "available" && item.attemptStatus !== "submitted",
    );
    const counts = {
      all: examAvailability.length,
      available: startable.length,
      upcoming: examAvailability.filter((item) => item.availability === "upcoming").length,
      completed: mySubmitted.length,
    };

    const activity = mySubmitted
      .slice()
      .reverse()
      .slice(0, 6)
      .map((item) => ({
        type: "submitted",
        title: "Submitted",
        detail: examAvailability.find((exam) => exam.id === String(item.examId))?.title ?? "Exam",
        at: item.submittedAt ? new Date(item.submittedAt).toISOString() : null,
      }));

    res.json({
      summary: {
        avgScore,
        weeklyDelta,
        avgAttemptSeconds,
        focusStreak,
        cohortRank,
        cohortSize,
        integrityScore,
        submittedCount: mySubmitted.length,
        trajectory,
        activity,
        examCounts: counts,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:examId", async (req, res, next) => {
  try {
    const exam = await getPublishedExamForStudent(req.params.examId, req.user);
    const attempt = await attempts().findOne({
      examId: exam._id,
      userId: req.user.sub,
      status: { $in: ["in_progress", "submitted"] },
    });
    res.json({
      exam: {
        ...studentExam(exam),
        attemptStatus:
          attempt?.status === "submitted" || attempt?.status === "in_progress"
            ? attempt.status
            : null,
        attemptId: attempt?._id ? String(attempt._id) : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:examId/attempts", async (req, res, next) => {
  try {
    const exam = await getPublishedExamForStudent(req.params.examId, req.user);
    const now = new Date();
    const existing = await attempts().findOne({
      examId: exam._id,
      userId: req.user.sub,
      status: { $in: ["in_progress", "submitted"] },
    });

    if (existing?.status === "submitted") {
      throw new AppError("You have already submitted this exam", 409, "ATTEMPT_ALREADY_SUBMITTED");
    }

    if (existing?.status === "in_progress") {
      res.json({
        attempt: {
          id: String(existing._id),
          examId: String(exam._id),
          status: "in_progress",
          startedAt: existing.startedAt,
          durationSeconds: existing.durationSeconds ?? exam.durationSeconds,
        },
      });
      return;
    }

    const result = await attempts().insertOne({
      examId: exam._id,
      userId: req.user.sub,
      userEmail: req.user.email,
      status: "in_progress",
      startedAt: now,
      lastSeenAt: now,
      durationSeconds: exam.durationSeconds,
      questionCount: exam.questions.length,
      createdAt: now,
      updatedAt: now,
    });

    await preExamEvents().insertOne({
      examId: exam._id,
      attemptId: result.insertedId,
      userId: req.user.sub,
      type: "attempt_started",
      occurredAt: now,
      details: {},
      createdAt: now,
    });

    res.status(201).json({
      attempt: {
        id: String(result.insertedId),
        examId: String(exam._id),
        status: "in_progress",
        startedAt: now,
        durationSeconds: exam.durationSeconds,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:examId/events", async (req, res, next) => {
  try {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("Invalid event", 400, "INVALID_EVENT");
    const exam = await getPublishedExamForStudent(req.params.examId, req.user);

    await preExamEvents().insertOne({
      examId: exam._id,
      userId: req.user.sub,
      type: parsed.data.type,
      occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
      details: parsed.data.details ?? {},
      createdAt: new Date(),
    });

    res.status(202).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.patch("/attempts/:attemptId/answers", async (req, res, next) => {
  try {
    const parsed = answerSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("Invalid answer", 400, "INVALID_ANSWER");
    if (!objectIdSchema.safeParse(req.params.attemptId).success) {
      throw new AppError("Attempt not found", 404, "ATTEMPT_NOT_FOUND");
    }

    const attemptId = new ObjectId(req.params.attemptId);
    const attempt = await attempts().findOne({ _id: attemptId, userId: req.user.sub });
    if (!attempt || attempt.status !== "in_progress") {
      throw new AppError("Attempt not found", 404, "ATTEMPT_NOT_FOUND");
    }

    const now = new Date();
    const setDoc = {
      attemptId,
      examId: attempt.examId,
      userId: req.user.sub,
      questionId: parsed.data.questionId,
      updatedAt: now,
    };
    if (parsed.data.answerIndex != null) setDoc.answerIndex = parsed.data.answerIndex;
    if (parsed.data.codeAnswer != null) {
      setDoc.codeAnswer = parsed.data.codeAnswer;
      setDoc.language = parsed.data.language || null;
    }

    await answers().updateOne(
      { attemptId, questionId: parsed.data.questionId },
      {
        $set: setDoc,
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    await attempts().updateOne({ _id: attemptId }, { $set: { lastSeenAt: now, updatedAt: now } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/attempts/:attemptId/events", async (req, res, next) => {
  try {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("Invalid event", 400, "INVALID_EVENT");
    if (!objectIdSchema.safeParse(req.params.attemptId).success) {
      throw new AppError("Attempt not found", 404, "ATTEMPT_NOT_FOUND");
    }

    const attemptId = new ObjectId(req.params.attemptId);
    const attempt = await attempts().findOne({ _id: attemptId, userId: req.user.sub });
    if (!attempt) throw new AppError("Attempt not found", 404, "ATTEMPT_NOT_FOUND");

    await events().insertOne({
      attemptId,
      examId: attempt.examId,
      userId: req.user.sub,
      type: parsed.data.type,
      occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
      details: parsed.data.details ?? {},
      createdAt: new Date(),
      source: "http",
    });

    res.status(202).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/attempts/:attemptId/events/bulk", async (req, res, next) => {
  try {
    const parsed = eventListSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("Invalid events", 400, "INVALID_EVENTS");
    if (!objectIdSchema.safeParse(req.params.attemptId).success) {
      throw new AppError("Attempt not found", 404, "ATTEMPT_NOT_FOUND");
    }

    const attemptId = new ObjectId(req.params.attemptId);
    const attempt = await attempts().findOne({ _id: attemptId, userId: req.user.sub });
    if (!attempt) throw new AppError("Attempt not found", 404, "ATTEMPT_NOT_FOUND");

    const now = new Date();
    await events().insertMany(
      parsed.data.events.map((event) => ({
        attemptId,
        examId: attempt.examId,
        userId: req.user.sub,
        type: event.type,
        occurredAt: event.occurredAt ? new Date(event.occurredAt) : now,
        details: event.details ?? {},
        createdAt: now,
        source: "http_bulk",
      })),
      { ordered: false },
    );

    res.status(202).json({ ok: true, count: parsed.data.events.length });
  } catch (err) {
    next(err);
  }
});

router.post("/attempts/:attemptId/submit", async (req, res, next) => {
  try {
    if (!objectIdSchema.safeParse(req.params.attemptId).success) {
      throw new AppError("Attempt not found", 404, "ATTEMPT_NOT_FOUND");
    }

    const attemptId = new ObjectId(req.params.attemptId);
    const attempt = await attempts().findOne({ _id: attemptId, userId: req.user.sub });
    if (!attempt) throw new AppError("Attempt not found", 404, "ATTEMPT_NOT_FOUND");

    const exam = await exams().findOne({ _id: attempt.examId });
    if (!exam) throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");

    const submittedAnswers = await answers().find({ attemptId }).toArray();
    const answerByQuestion = new Map(submittedAnswers.map((item) => [item.questionId, item]));
    const score = exam.questions.reduce((total, question) => {
      if (question.type === "CODING") return total;
      const answer = answerByQuestion.get(question.id);
      return total + (answer?.answerIndex === question.answerIndex ? question.marks : 0);
    }, 0);
    const codingPendingMarks = exam.questions
      .filter((question) => question.type === "CODING")
      .reduce((sum, question) => sum + (question.marks || 0), 0);
    const submittedAt = new Date();

    await attempts().updateOne(
      { _id: attemptId },
      {
        $set: {
          status: "submitted",
          submittedAt,
          score,
          totalMarks: exam.totalMarks,
          codingPendingMarks,
          updatedAt: submittedAt,
        },
      },
    );

    res.json({
      submission: {
        attemptId: String(attemptId),
        score: exam.resultsReleased ? score : null,
        totalMarks: exam.totalMarks,
        submittedAt,
        resultsReleased: Boolean(exam.resultsReleased),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
