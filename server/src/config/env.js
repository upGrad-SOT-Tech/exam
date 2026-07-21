import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env"),
});

const schema = z.object({
  PORT: z.coerce.number().default(4200),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGODB_URI: z.string().min(1),
  LMS_DB_NAME: z.string().default("lms"),
  EXAM_DB_NAME: z.string().default("exam_app"),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  OTP_EXPIRES_MINUTES: z.coerce.number().default(10),
  OTP_LENGTH: z.coerce.number().default(6),
  EMAIL_SERVICE: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_FROM_NAME: z.string().optional(),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  LMS_ADMIN_ORIGIN: z.string().default("http://localhost:3001"),
  EXAM_ADMIN_API_KEY: z.string().min(16).default("dev-exam-admin-key-change-me"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("electron_test_app"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
