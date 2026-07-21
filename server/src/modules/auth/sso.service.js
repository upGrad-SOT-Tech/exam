import crypto from "node:crypto";
import { getLmsDb } from "../../db/mongo.js";
import { AppError, normalizeEmail } from "../../shared/errors.js";
import { findAccountByEmail, toPublicUser } from "./auth.repository.js";
import { issueTokenPair } from "./token.service.js";

/**
 * Single sign-on handoff from the LMS.
 *
 * The student clicks a scheduled exam in the LMS web app; the LMS mints a one-time code
 * (lms_prod examLaunch.service.js) into `lms.exam_launch_handoffs` and opens
 * `upgradexam://launch?code=…&examId=…`. The OS routes that to this app, which posts the code here.
 * We redeem it — atomically, once — and issue this app's own session for the same account.
 *
 * The code is the whole credential, so redemption is deliberately strict: the findOneAndUpdate
 * below only matches a row that is unredeemed AND unexpired, so a replayed or stale code loses the
 * race and gets nothing. Both apps share the `lms` database, which is what makes this a lookup
 * rather than a network call back to the LMS.
 */

const HANDOFF_COLLECTION = "exam_launch_handoffs";

function handoffs() {
  return getLmsDb().collection(HANDOFF_COLLECTION);
}

function hashLaunchCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

export async function redeemLaunchCode(code) {
  const trimmed = String(code || "").trim();
  if (!trimmed) {
    throw new AppError("Launch code required.", 400, "LAUNCH_CODE_REQUIRED");
  }

  const now = new Date();
  // Driver v6 returns the document itself (no `.value` envelope).
  const handoff = await handoffs().findOneAndUpdate(
    { codeHash: hashLaunchCode(trimmed), redeemedAt: null, expiresAt: { $gt: now } },
    { $set: { redeemedAt: now, redeemedBy: "desktop" } },
    { returnDocument: "after" },
  );

  if (!handoff) {
    throw new AppError(
      "This launch link has expired or was already used. Open the exam from the LMS again.",
      401,
      "LAUNCH_CODE_INVALID",
    );
  }

  const email = normalizeEmail(handoff.email);
  const account = await findAccountByEmail(email);
  if (!account) {
    throw new AppError("You are not authorised to access this platform", 403, "NOT_AUTHORIZED");
  }

  const tokens = await issueTokenPair({
    sub: account.doc._id.toString(),
    role: account.accountType,
    email,
  });

  return {
    ...tokens,
    role: account.accountType,
    user: toPublicUser(account.doc, account.accountType),
    examId: handoff.examId ? String(handoff.examId) : null,
    // The pre-exam gate, never the paper itself — system checks and proctoring consent run there.
    redirectTo: handoff.examId ? `/exams/${handoff.examId}/start` : "/home",
  };
}
