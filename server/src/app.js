import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import authRoutes from "./modules/auth/auth.routes.js";
import examRoutes from "./modules/exams/exam.routes.js";
import adminExamRoutes from "./modules/exams/admin.exams.routes.js";
import proctoringRoutes from "./modules/proctoring/proctoring.routes.js";
import systemChecksRoutes from "./modules/system-checks/system-checks.routes.js";

export function createApp() {
  const app = express();
  const allowedOrigins = [env.CLIENT_ORIGIN, env.LMS_ADMIN_ORIGIN].filter(Boolean);

  app.disable("x-powered-by");
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "25mb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "electron-candidate-api" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/exams", examRoutes);
  app.use("/api/admin", adminExamRoutes);
  app.use("/api/proctoring", proctoringRoutes);
  app.use("/api/system-checks", systemChecksRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
