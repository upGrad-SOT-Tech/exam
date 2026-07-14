import { ObjectId } from "mongodb";
import { Router } from "express";
import { z } from "zod";
import { getExamDb } from "../../db/mongo.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { AppError } from "../../shared/errors.js";

const router = Router();

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i);
const answerSchema = z.object({
  questionId: z.string().min(1),
  answerIndex: z.number().int().min(0),
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

function publicExam(exam) {
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
    questionCount: exam.questions.length,
  };
}

function studentExam(exam) {
  return {
    ...publicExam(exam),
    questions: exam.questions.map((question) => ({
      id: question.id,
      sequence: question.sequence,
      text: question.text,
      options: question.options,
      marks: question.marks,
    })),
  };
}

async function getPublishedExam(id) {
  if (!objectIdSchema.safeParse(id).success) {
    throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
  }

  const exam = await exams().findOne({ _id: new ObjectId(id), status: "published" });
  if (!exam) throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
  return exam;
}

router.use(requireAuth);

router.get("/", async (_req, res, next) => {
  try {
    const now = new Date();
    const items = await exams()
      .find({
        status: "published",
        availableFrom: { $lte: now },
        availableUntil: { $gte: now },
      })
      .sort({ availableUntil: 1 })
      .toArray();

    res.json({ exams: items.map(publicExam) });
  } catch (err) {
    next(err);
  }
});

router.get("/:examId", async (req, res, next) => {
  try {
    const exam = await getPublishedExam(req.params.examId);
    res.json({ exam: studentExam(exam) });
  } catch (err) {
    next(err);
  }
});

router.post("/:examId/attempts", async (req, res, next) => {
  try {
    const exam = await getPublishedExam(req.params.examId);
    const now = new Date();
    const existing = await attempts().findOne({
      examId: exam._id,
      userId: req.user.sub,
      status: { $in: ["in_progress", "submitted"] },
    });

    if (existing) {
      throw new AppError("Attempt already exists for this exam", 409, "ATTEMPT_ALREADY_EXISTS");
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
    const exam = await getPublishedExam(req.params.examId);

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
    await answers().updateOne(
      { attemptId, questionId: parsed.data.questionId },
      {
        $set: {
          attemptId,
          examId: attempt.examId,
          userId: req.user.sub,
          questionId: parsed.data.questionId,
          answerIndex: parsed.data.answerIndex,
          updatedAt: now,
        },
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
    const answerByQuestion = new Map(submittedAnswers.map((item) => [item.questionId, item.answerIndex]));
    const score = exam.questions.reduce((total, question) => {
      return total + (answerByQuestion.get(question.id) === question.answerIndex ? question.marks : 0);
    }, 0);
    const submittedAt = new Date();

    await attempts().updateOne(
      { _id: attemptId },
      {
        $set: {
          status: "submitted",
          submittedAt,
          score,
          totalMarks: exam.totalMarks,
          updatedAt: submittedAt,
        },
      },
    );

    res.json({
      submission: {
        attemptId: String(attemptId),
        score,
        totalMarks: exam.totalMarks,
        submittedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
