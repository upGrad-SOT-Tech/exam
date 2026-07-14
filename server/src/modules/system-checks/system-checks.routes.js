import { Router } from "express";
import { z } from "zod";

const reportSchema = z.object({
  runId: z.string().min(1),
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1),
  platform: z.string().min(1),
  appVersion: z.string().min(1),
  passed: z.boolean(),
  blocked: z.boolean(),
  checks: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      status: z.enum(["pending", "running", "passed", "failed", "warning", "skipped"]),
      severity: z.enum(["block", "warn"]),
      message: z.string(),
      durationMs: z.number().nonnegative(),
    }),
  ),
});

const router = Router();

router.post("/audit", (req, res) => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid system check report" });
  }

  const report = parsed.data;
  console.info("[system-checks:audit]", {
    runId: report.runId,
    platform: report.platform,
    appVersion: report.appVersion,
    passed: report.passed,
    blocked: report.blocked,
    failedChecks: report.checks.filter((check) => check.status === "failed").map((check) => check.id),
  });

  return res.status(202).json({ ok: true, runId: report.runId });
});

export default router;
