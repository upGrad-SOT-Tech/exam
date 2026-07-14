import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import authRoutes from "./modules/auth/auth.routes.js";
import examRoutes from "./modules/exams/exam.routes.js";
import proctoringRoutes from "./modules/proctoring/proctoring.routes.js";
import systemChecksRoutes from "./modules/system-checks/system-checks.routes.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
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
  app.use("/api/proctoring", proctoringRoutes);
  app.use("/api/system-checks", systemChecksRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
