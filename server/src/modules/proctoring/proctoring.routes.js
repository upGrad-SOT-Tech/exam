import { ObjectId } from "mongodb";
import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { env } from "../../config/env.js";
import { getExamDb } from "../../db/mongo.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { AppError } from "../../shared/errors.js";

const router = Router();
const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i);
const uploadSchema = z.object({
  attemptId: objectIdSchema,
  path: z.string().min(1).max(500),
  contentType: z.enum(["application/json", "image/jpeg"]),
  bodyBase64: z.string().min(1),
});

let supabase = null;

function getSupabase() {
  if (supabase) return supabase;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new AppError("Supabase storage is not configured", 500, "SUPABASE_NOT_CONFIGURED");
  }
  supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabase;
}

function attempts() {
  return getExamDb().collection("attempts");
}

function safeStoragePath(path) {
  const normalized = path.replace(/^\/+/, "");
  if (normalized.includes("..") || normalized.includes("\\")) {
    throw new AppError("Invalid storage path", 400, "INVALID_STORAGE_PATH");
  }
  return normalized;
}

router.post("/uploads", requireAuth, async (req, res, next) => {
  try {
    const payload = uploadSchema.parse(req.body);
    const attempt = await attempts().findOne({
      _id: new ObjectId(payload.attemptId),
      userId: req.user.sub,
    });

    if (!attempt) {
      throw new AppError("Attempt not found", 404, "ATTEMPT_NOT_FOUND");
    }

    const path = safeStoragePath(payload.path);
    const expectedPrefix = `attempts/${payload.attemptId}/`;
    if (!path.startsWith(expectedPrefix)) {
      throw new AppError("Storage path does not match attempt", 400, "INVALID_STORAGE_PATH");
    }

    const buffer = Buffer.from(payload.bodyBase64, "base64");
    const { error } = await getSupabase()
      .storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .upload(path, buffer, {
        contentType: payload.contentType,
        upsert: true,
        cacheControl: "3600",
      });

    if (error) {
      throw new AppError(error.message, 502, "SUPABASE_UPLOAD_FAILED");
    }

    res.status(201).json({
      uploaded: true,
      bucket: env.SUPABASE_STORAGE_BUCKET,
      path,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError("Invalid upload payload", 400, "INVALID_UPLOAD_PAYLOAD", err.flatten()));
    }
    next(err);
  }
});

export default router;
