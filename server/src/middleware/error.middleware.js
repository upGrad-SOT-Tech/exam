import { env } from "../config/env.js";

export function errorHandler(err, _req, res, _next) {
  if (err?.name === "ZodError") {
    return res.status(400).json({
      error: { message: err.errors?.[0]?.message || "Invalid request", code: "VALIDATION_ERROR" },
    });
  }

  const status = err.statusCode || 500;
  const message =
    status >= 500 && env.NODE_ENV === "production"
      ? "Something went wrong"
      : err.message || "Something went wrong";

  if (status >= 500) console.error("[error]", err);
  res.status(status).json({ error: { message, code: err.code || "INTERNAL_ERROR" } });
}

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: { message: "Not found", code: "NOT_FOUND" } });
}
