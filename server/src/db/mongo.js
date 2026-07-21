import { MongoClient } from "mongodb";
import dns from "node:dns";
import { env } from "../config/env.js";
import { seedDefaultExam } from "../modules/exams/seed.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

let client;
let lmsDb;
let examDb;

export async function connectMongo() {
  if (lmsDb && examDb) return lmsDb;

  client = new MongoClient(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15_000,
    connectTimeoutMS: 15_000,
    maxPoolSize: 20,
    minPoolSize: 2,
  });

  await client.connect();
  lmsDb = client.db(env.LMS_DB_NAME);
  examDb = client.db(env.EXAM_DB_NAME);

  await Promise.all([
    lmsDb.collection("students").createIndex({ email: 1 }, { unique: true }),
    lmsDb.collection("candidates").createIndex({ email: 1 }, { unique: true }),
    lmsDb.collection("otp_sessions").createIndex({ email: 1, purpose: 1 }),
    lmsDb.collection("otp_sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    lmsDb.collection("refresh_tokens").createIndex({ tokenHash: 1 }, { unique: true }),
    lmsDb.collection("refresh_tokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    examDb.collection("exams").createIndex({ slug: 1 }, { unique: true }),
    examDb.collection("exams").createIndex({ status: 1, availableFrom: 1, availableUntil: 1 }),
    examDb.collection("exams").createIndex({ "targeting.mode": 1 }),
    examDb.collection("exams").createIndex({ paperId: 1 }),
    examDb.collection("exams").createIndex({ resultsReleased: 1 }),
    examDb.collection("attempts").createIndex({ userId: 1, examId: 1, status: 1 }),
    examDb.collection("attempts").createIndex({ startedAt: 1 }),
    examDb.collection("attempt_answers").createIndex({ attemptId: 1, questionId: 1 }, { unique: true }),
    examDb.collection("proctor_events").createIndex({ attemptId: 1, occurredAt: 1 }),
    examDb.collection("proctor_events").createIndex({ userId: 1, occurredAt: 1 }),
    examDb.collection("pre_exam_events").createIndex({ examId: 1, userId: 1, occurredAt: 1 }),
  ]);

  await seedDefaultExam(examDb);

  console.log(`[db] connected → ${env.LMS_DB_NAME}`);
  console.log(`[db] connected → ${env.EXAM_DB_NAME}`);
  return lmsDb;
}

export function getLmsDb() {
  if (!lmsDb) throw new Error("MongoDB not connected");
  return lmsDb;
}

export function getExamDb() {
  if (!examDb) throw new Error("MongoDB not connected");
  return examDb;
}

export async function closeMongo() {
  if (!client) return;
  await client.close();
  client = null;
  lmsDb = null;
  examDb = null;
}
