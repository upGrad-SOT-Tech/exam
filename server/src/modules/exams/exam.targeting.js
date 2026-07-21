/**
 * Pure targeting matcher for scheduled exams.
 * Keep this free of Express/Mongo so it can be unit-tested in isolation.
 */

function norm(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function includesNormalized(list, value) {
  if (!Array.isArray(list) || list.length === 0) return false;
  const needle = norm(value);
  if (!needle) return false;
  return list.some((entry) => norm(entry) === needle);
}

/**
 * @param {object} targeting
 * @param {object} student  { id, email, campus, cohortId, cohortName, programName, batch, batchName }
 */
export function studentMatchesTargeting(targeting, student) {
  if (!targeting || targeting.mode === "all" || !targeting.mode) return true;
  if (!student) return false;

  if (targeting.mode === "individuals") {
    const idHit = includesNormalized(targeting.studentIds, student.id);
    const emailHit = includesNormalized(targeting.studentEmails, student.email);
    return idHit || emailHit;
  }

  // mode === "filters" — every non-empty filter dimension must match.
  const checks = [];

  if (targeting.campuses?.length) {
    checks.push(includesNormalized(targeting.campuses, student.campus));
  }
  if (targeting.cohortIds?.length) {
    checks.push(
      includesNormalized(targeting.cohortIds, student.cohortId) ||
        includesNormalized(targeting.cohortIds, student.cohortName),
    );
  }
  if (targeting.programs?.length) {
    checks.push(includesNormalized(targeting.programs, student.programName));
  }
  if (targeting.batches?.length) {
    checks.push(
      includesNormalized(targeting.batches, student.batch) ||
        includesNormalized(targeting.batches, student.batchName),
    );
  }

  // No filters selected → treat as open to all.
  if (checks.length === 0) return true;
  return checks.every(Boolean);
}

export function emptyTargeting() {
  return {
    mode: "all",
    campuses: [],
    cohortIds: [],
    programs: [],
    batches: [],
    studentIds: [],
    studentEmails: [],
  };
}

export function normalizeTargeting(input = {}) {
  const mode = ["all", "filters", "individuals"].includes(input.mode) ? input.mode : "all";
  return {
    mode,
    campuses: Array.isArray(input.campuses) ? input.campuses.map(String).filter(Boolean) : [],
    cohortIds: Array.isArray(input.cohortIds) ? input.cohortIds.map(String).filter(Boolean) : [],
    programs: Array.isArray(input.programs) ? input.programs.map(String).filter(Boolean) : [],
    batches: Array.isArray(input.batches) ? input.batches.map(String).filter(Boolean) : [],
    studentIds: Array.isArray(input.studentIds) ? input.studentIds.map(String).filter(Boolean) : [],
    studentEmails: Array.isArray(input.studentEmails)
      ? input.studentEmails.map((email) => String(email).trim().toLowerCase()).filter(Boolean)
      : [],
  };
}
