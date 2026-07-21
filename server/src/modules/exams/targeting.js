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

/**
 * Every cohort id this candidate belongs to, as strings.
 *
 * A student sits in TWO cohort systems: the LMS academic cohorts they're enrolled in
 * (`lms_cohort_enrollments` → `cohortIds`) and the engagement/builder cohort (`candidates.cohortId`
 * → `cohortId`). The LMS scheduler targets the former; matching only the latter meant a
 * cohort-targeted paper matched nobody. Match against the union.
 */
export function cohortKeysFor(student = {}) {
  const keys = new Set();
  for (const id of Array.isArray(student.cohortIds) ? student.cohortIds : []) {
    const key = String(id || "").trim();
    if (key) keys.add(key);
  }
  const primary = String(student.cohortId || "").trim();
  if (primary) keys.add(primary);
  return keys;
}

export function studentMatchesTargeting(student, targeting = {}) {
  const mode = targeting?.mode || "all";
  if (mode === "all") return true;

  if (mode === "individuals") {
    const emails = new Set((targeting.studentEmails || []).map(norm));
    return emails.has(norm(student.email));
  }

  // Explicit cohorts ARE the audience — campus / program / batch are only how the admin narrowed
  // the cohort picker, and a cohort already sits inside exactly one of each. Mirrors lms_prod
  // webContestAccess.studentMatchesTargeting; the two must agree or the desktop and the LMS will
  // disagree about which papers a candidate has. See that file for why ANDing them emptied the
  // audience (id-vs-label, and most students carry no batch at all).
  const cohortKeys = cohortKeysFor(student);
  if (targeting.cohortIds?.length) {
    return targeting.cohortIds.some((item) => cohortKeys.has(String(item)));
  }

  const campusOk =
    !targeting.campuses?.length || targeting.campuses.some((item) => norm(item) === norm(student.campus));
  const programOk =
    !targeting.programs?.length || targeting.programs.some((item) => norm(item) === norm(student.programName));
  const batchOk =
    !targeting.batches?.length || targeting.batches.some((item) => norm(item) === norm(student.batch));

  return campusOk && programOk && batchOk;
}

/**
 * Resolves the logged-in candidate's targeting profile from the LMS identity store. Returns the
 * exact field set studentMatchesTargeting reads. Candidates and academic students live in separate
 * collections; check candidates first (the common case) then students.
 *
 * Academic cohort membership comes from `lms_cohort_enrollments` (active rows), NOT from
 * `candidates.cohortId` — that field points at the engagement/builder cohort, a different system.
 * Mirrors lms_prod studentExams.resolveStudentTargetingContext; the two must stay in step or the
 * desktop and the LMS will disagree about which papers a candidate has.
 */
export async function resolveCandidateTargeting(email) {
  const normalized = normalizeEmail(email);
  const base = {
    email: normalized,
    campus: null,
    cohortId: null,
    cohortIds: [],
    programName: null,
    batch: null,
  };
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

  const [doc, enrollments] = await Promise.all([
    lms
      .collection("candidates")
      .findOne({ email: normalized }, { projection })
      .then((found) => found || lms.collection("students").findOne({ email: normalized }, { projection })),
    lms
      .collection("lms_cohort_enrollments")
      .find({ email: normalized, status: "active" }, { projection: { cohortId: 1, campus: 1 } })
      .toArray(),
  ]);

  const cohortIds = [
    ...new Set(enrollments.map((row) => String(row.cohortId || "").trim()).filter(Boolean)),
  ];
  if (!doc) return { ...base, cohortIds, campus: enrollments[0]?.campus || null };

  const profile = doc.profileSnapshot || {};
  return {
    email: normalized,
    campus:
      doc.campus || profile.preferredCampus || profile.universityPreference || enrollments[0]?.campus || null,
    cohortId: doc.cohortId || null,
    cohortIds,
    programName: profile.programName || profile.program || doc.programName || null,
    batch: doc.batch || profile.batch || null,
  };
}
