import { getLmsDb } from "../../db/mongo.js";
import { normalizeEmail } from "../../shared/errors.js";

/**
 * Exam assignment ("who is this paper for"). Exams scheduled by the LMS carry a `targeting` object
 * — mode "all", "individuals" (by email), or filtered by campus / cohort / program / batch. This
 * mirrors the LMS's own matcher (lms_prod webContestAccess.studentMatchesTargeting +
 * studentExams.resolveStudentTargetingContext) so the desktop app shows a candidate exactly the
 * papers the LMS assigned to them — no more, no less.
 */

function norm(value) {
  return String(value || "").trim().toLowerCase();
}

export function studentMatchesTargeting(student, targeting = {}) {
  const mode = targeting?.mode || "all";
  if (mode === "all") return true;

  if (mode === "individuals") {
    const emails = new Set((targeting.studentEmails || []).map(norm));
    return emails.has(norm(student.email));
  }

  const campusOk =
    !targeting.campuses?.length || targeting.campuses.some((item) => norm(item) === norm(student.campus));
  const cohortOk =
    !targeting.cohortIds?.length || targeting.cohortIds.some((item) => String(item) === String(student.cohortId));
  const programOk =
    !targeting.programs?.length || targeting.programs.some((item) => norm(item) === norm(student.programName));
  const batchOk =
    !targeting.batches?.length || targeting.batches.some((item) => norm(item) === norm(student.batch));

  return campusOk && cohortOk && programOk && batchOk;
}

/**
 * Resolves the logged-in candidate's targeting profile from the LMS identity store. Returns the
 * exact field set studentMatchesTargeting reads. Candidates and academic students live in separate
 * collections; check candidates first (the common case) then students.
 */
export async function resolveCandidateTargeting(email) {
  const normalized = normalizeEmail(email);
  const base = { email: normalized, campus: null, cohortId: null, programName: null, batch: null };
  if (!normalized) return base;

  const lms = getLmsDb();
  const projection = {
    email: 1,
    campus: 1,
    cohortId: 1,
    cohortName: 1,
    batch: 1,
    "profileSnapshot.programName": 1,
    "profileSnapshot.program": 1,
    "profileSnapshot.preferredCampus": 1,
    "profileSnapshot.universityPreference": 1,
    "profileSnapshot.batch": 1,
  };

  const doc =
    (await lms.collection("candidates").findOne({ email: normalized }, { projection })) ||
    (await lms.collection("students").findOne({ email: normalized }, { projection }));
  if (!doc) return base;

  const profile = doc.profileSnapshot || {};
  return {
    email: normalized,
    campus: doc.campus || profile.preferredCampus || profile.universityPreference || null,
    cohortId: doc.cohortId || null,
    programName: profile.programName || profile.program || doc.programName || null,
    batch: doc.batch || profile.batch || null,
  };
}
