import crypto from "node:crypto";
import { ObjectId } from "mongodb";
import { Router } from "express";
import { z } from "zod";
import { getExamDb, getLmsDb } from "../../db/mongo.js";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors.js";
import { emptyTargeting, normalizeTargeting } from "./exam.targeting.js";

const router = Router();

const targetingSchema = z.object({
  mode: z.enum(["all", "filters", "individuals"]).default("all"),
  campuses: z.array(z.string()).default([]),
  cohortIds: z.array(z.string()).default([]),
  cohortLabels: z.array(z.string()).default([]),
  programs: z.array(z.string()).default([]),
  programLabels: z.array(z.string()).default([]),
  batches: z.array(z.string()).default([]),
  batchLabels: z.array(z.string()).default([]),
  studentIds: z.array(z.string()).default([]),
  studentEmails: z.array(z.string().email()).default([]),
});

const questionSchema = z
  .object({
    id: z.string().min(1),
    sequence: z.number().int().positive(),
    text: z.string().min(1),
    marks: z.number().positive(),
    type: z.enum(["MCQ", "CODING"]).optional(),
    options: z.array(z.string()).optional(),
    answerIndex: z.number().int().min(0).optional(),
    language: z.string().optional(),
    starterCode: z.string().optional(),
    samples: z
      .array(
        z.object({
          input: z.string().optional(),
          output: z.string().optional(),
          explanation: z.string().optional(),
        }),
      )
      .optional(),
    constraints: z.string().optional(),
    taxonomy: z.string().optional(),
    co: z.string().optional(),
    difficulty: z.string().optional(),
  })
  .superRefine((question, ctx) => {
    const type = question.type === "CODING" ? "CODING" : "MCQ";
    if (type === "MCQ") {
      if (!question.options?.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "MCQ needs options" });
      }
      if (question.answerIndex == null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "MCQ needs answerIndex" });
      } else if (question.options && question.answerIndex >= question.options.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid answerIndex" });
      }
    }
  });

const createExamSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional().default(""),
  durationMinutes: z.number().int().positive().max(600),
  availableFrom: z.string().datetime(),
  availableUntil: z.string().datetime(),
  paperId: z.string().optional(),
  paperSnapshot: z.record(z.unknown()).optional(),
  questions: z.array(questionSchema).min(1),
  targeting: targetingSchema.optional(),
  status: z.enum(["published", "draft"]).optional().default("published"),
});

function exams() {
  return getExamDb().collection("exams");
}

function attempts() {
  return getExamDb().collection("attempts");
}

function requireAdminKey(req, _res, next) {
  const key = req.headers["x-exam-admin-key"];
  if (!key || key !== env.EXAM_ADMIN_API_KEY) {
    return next(new AppError("Admin authorization required", 401, "ADMIN_UNAUTHORIZED"));
  }
  return next();
}

router.use(requireAdminKey);

function publicAdminExam(exam, now = new Date()) {
  const availableFrom = new Date(exam.availableFrom);
  const availableUntil = new Date(exam.availableUntil);
  let availability = "closed";
  if (availableFrom > now) availability = "upcoming";
  else if (availableUntil >= now) availability = "available";

  return {
    id: String(exam._id),
    slug: exam.slug,
    title: exam.title,
    description: exam.description || "",
    durationSeconds: exam.durationSeconds,
    durationMinutes: Math.round(exam.durationSeconds / 60),
    totalMarks: exam.totalMarks,
    questionCount: exam.questions?.length || 0,
    availableFrom: new Date(exam.availableFrom).toISOString(),
    availableUntil: new Date(exam.availableUntil).toISOString(),
    status: exam.status,
    availability,
    targeting: exam.targeting || emptyTargeting(),
    resultsReleased: Boolean(exam.resultsReleased),
    resultsReleasedAt: exam.resultsReleasedAt
      ? new Date(exam.resultsReleasedAt).toISOString()
      : null,
    paperId: exam.paperId || null,
    createdAt: exam.createdAt ? new Date(exam.createdAt).toISOString() : null,
    updatedAt: exam.updatedAt ? new Date(exam.updatedAt).toISOString() : null,
  };
}

function slugify(title) {
  const base = String(title || "exam")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${base || "exam"}-${crypto.randomUUID().slice(0, 8)}`;
}

router.get("/exams", async (_req, res, next) => {
  try {
    const items = await exams().find({}).sort({ createdAt: -1 }).limit(200).toArray();
    res.json({ exams: items.map((exam) => publicAdminExam(exam)) });
  } catch (err) {
    next(err);
  }
});

router.get("/exams/:examId", async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.examId)) {
      throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    }
    const exam = await exams().findOne({ _id: new ObjectId(req.params.examId) });
    if (!exam) throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    res.json({ exam: publicAdminExam(exam) });
  } catch (err) {
    next(err);
  }
});

router.post("/exams", async (req, res, next) => {
  try {
    const parsed = createExamSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || "Invalid exam payload", 400, "INVALID_EXAM");
    }

    const data = parsed.data;
    const availableFrom = new Date(data.availableFrom);
    const availableUntil = new Date(data.availableUntil);
    if (!(availableUntil > availableFrom)) {
      throw new AppError("availableUntil must be after availableFrom", 400, "INVALID_WINDOW");
    }

    for (const question of data.questions) {
      if (question.type !== "CODING" && question.options && question.answerIndex >= question.options.length) {
        throw new AppError(`Invalid answerIndex for question ${question.id}`, 400, "INVALID_ANSWER_INDEX");
      }
    }

    const totalMarks = data.questions.reduce((sum, question) => sum + question.marks, 0);
    const now = new Date();
    const doc = {
      slug: slugify(data.title),
      title: data.title.trim(),
      description: data.description || "",
      durationSeconds: data.durationMinutes * 60,
      totalMarks,
      status: data.status,
      availableFrom,
      availableUntil,
      questions: data.questions,
      targeting: normalizeTargeting(data.targeting || emptyTargeting()),
      resultsReleased: false,
      resultsReleasedAt: null,
      paperId: data.paperId || null,
      paperSnapshot: data.paperSnapshot || null,
      source: "lms",
      settings: {
        shuffleQuestions: false,
        shuffleOptions: false,
        allowReview: true,
        proctoringRequired: true,
      },
      createdAt: now,
      updatedAt: now,
    };

    const result = await exams().insertOne(doc);
    const created = await exams().findOne({ _id: result.insertedId });
    res.status(201).json({ exam: publicAdminExam(created) });
  } catch (err) {
    next(err);
  }
});

router.post("/exams/:examId/release-results", async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.examId)) {
      throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    }
    const examId = new ObjectId(req.params.examId);
    const now = new Date();
    const updated = await exams().updateOne(
      { _id: examId },
      { $set: { resultsReleased: true, resultsReleasedAt: now, updatedAt: now } },
    );
    if (!updated.matchedCount) throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    const exam = await exams().findOne({ _id: examId });
    res.json({ exam: publicAdminExam(exam) });
  } catch (err) {
    next(err);
  }
});

router.post("/exams/:examId/revoke-results", async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.examId)) {
      throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    }
    const examId = new ObjectId(req.params.examId);
    const now = new Date();
    const updated = await exams().updateOne(
      { _id: examId },
      { $set: { resultsReleased: false, resultsReleasedAt: null, updatedAt: now } },
    );
    if (!updated.matchedCount) throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    const exam = await exams().findOne({ _id: examId });
    res.json({ exam: publicAdminExam(exam) });
  } catch (err) {
    next(err);
  }
});

router.get("/exams/:examId/results", async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.examId)) {
      throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    }
    const examId = new ObjectId(req.params.examId);
    const exam = await exams().findOne({ _id: examId });
    if (!exam) throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");

    const submitted = await attempts()
      .find({ examId, status: "submitted" })
      .sort({ submittedAt: -1 })
      .toArray();

    const userIds = [...new Set(submitted.map((item) => item.userId).filter(Boolean))];
    const objectIds = userIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
    const students =
      objectIds.length === 0
        ? []
        : await getLmsDb()
            .collection("students")
            .find({ _id: { $in: objectIds } })
            .project({ email: 1, name: 1, profileSnapshot: 1, campus: 1, cohortId: 1, cohortName: 1 })
            .toArray();
    const studentById = new Map(students.map((doc) => [String(doc._id), doc]));

    const results = submitted.map((item) => {
      const student = studentById.get(String(item.userId));
      const name =
        student?.profileSnapshot?.fullName ||
        student?.profileSnapshot?.name ||
        student?.name ||
        "Student";
      return {
        attemptId: String(item._id),
        userId: item.userId,
        email: student?.email || null,
        name,
        campus: student?.campus || null,
        cohortId: student?.cohortId || null,
        cohortName: student?.cohortName || null,
        score: item.score ?? 0,
        totalMarks: item.totalMarks ?? exam.totalMarks ?? 0,
        percent:
          (item.totalMarks ?? exam.totalMarks ?? 0) > 0
            ? Math.round(((item.score ?? 0) / (item.totalMarks ?? exam.totalMarks)) * 100)
            : 0,
        submittedAt: item.submittedAt ? new Date(item.submittedAt).toISOString() : null,
      };
    });

    res.json({
      exam: publicAdminExam(exam),
      results,
      summary: {
        attempts: results.length,
        avgPercent:
          results.length === 0
            ? null
            : Math.round(results.reduce((sum, row) => sum + row.percent, 0) / results.length),
        resultsReleased: Boolean(exam.resultsReleased),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/exams/:examId", async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.examId)) {
      throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    }
    const examId = new ObjectId(req.params.examId);
    const deleted = await exams().deleteOne({ _id: examId });
    if (!deleted.deletedCount) throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    await attempts().deleteMany({ examId });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
