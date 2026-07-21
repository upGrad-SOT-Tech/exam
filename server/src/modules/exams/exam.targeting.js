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

  // mode === "filters"
  // When cohorts are selected, they are the source of truth for who can take the exam.
  // Campus / program / batch on the form are picker helpers and may store ObjectIds that
  // don't exist on the student profile — don't AND them or nobody matches.
  if (targeting.cohortIds?.length) {
    return (
      includesNormalized(targeting.cohortIds, student.cohortId) ||
      includesNormalized(targeting.cohortIds, student.cohortName)
    );
  }

  const checks = [];

  if (targeting.campuses?.length) {
    checks.push(includesNormalized(targeting.campuses, student.campus));
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
    cohortLabels: [],
    programs: [],
    programLabels: [],
    batches: [],
    batchLabels: [],
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
    cohortLabels: Array.isArray(input.cohortLabels)
      ? input.cohortLabels.map(String).filter(Boolean)
      : [],
    programs: Array.isArray(input.programs) ? input.programs.map(String).filter(Boolean) : [],
    programLabels: Array.isArray(input.programLabels)
      ? input.programLabels.map(String).filter(Boolean)
      : [],
    batches: Array.isArray(input.batches) ? input.batches.map(String).filter(Boolean) : [],
    batchLabels: Array.isArray(input.batchLabels)
      ? input.batchLabels.map(String).filter(Boolean)
      : [],
    studentIds: Array.isArray(input.studentIds) ? input.studentIds.map(String).filter(Boolean) : [],
    studentEmails: Array.isArray(input.studentEmails)
      ? input.studentEmails.map((email) => String(email).trim().toLowerCase()).filter(Boolean)
      : [],
  };
}
