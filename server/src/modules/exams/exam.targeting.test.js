import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  emptyTargeting,
  normalizeTargeting,
  studentMatchesTargeting,
} from "./exam.targeting.js";

const student = {
  id: "stu-1",
  email: "ada@upgrad.com",
  campus: "BLR",
  cohortId: "cohort-42",
  cohortName: "BLR-CSE-2024",
  programName: "B.Tech CSE",
  batch: "2024",
};

describe("studentMatchesTargeting", () => {
  it("allows everyone when mode is all", () => {
    assert.equal(studentMatchesTargeting(emptyTargeting(), student), true);
  });

  it("matches filter intersections", () => {
    const targeting = normalizeTargeting({
      mode: "filters",
      campuses: ["blr"],
      programs: ["B.Tech CSE"],
    });
    assert.equal(studentMatchesTargeting(targeting, student), true);
    assert.equal(
      studentMatchesTargeting({ ...targeting, campuses: ["DEL"] }, student),
      false,
    );
  });

  it("matches backlog individuals by email or id", () => {
    assert.equal(
      studentMatchesTargeting(
        normalizeTargeting({ mode: "individuals", studentEmails: ["ada@upgrad.com"] }),
        student,
      ),
      true,
    );
    assert.equal(
      studentMatchesTargeting(
        normalizeTargeting({ mode: "individuals", studentIds: ["stu-1"] }),
        student,
      ),
      true,
    );
    assert.equal(
      studentMatchesTargeting(
        normalizeTargeting({ mode: "individuals", studentEmails: ["other@x.com"] }),
        student,
      ),
      false,
    );
  });

  it("uses cohortIds as the audience source of truth when present", () => {
    const targeting = normalizeTargeting({
      mode: "filters",
      campuses: ["DEL"],
      batches: ["some-batch-object-id"],
      cohortIds: ["cohort-42"],
    });
    assert.equal(studentMatchesTargeting(targeting, student), true);
    assert.equal(
      studentMatchesTargeting(targeting, { ...student, cohortId: "other" }),
      false,
    );
  });
});

// Regression: a student in a BUILDER cohort plus an academic section must still match an exam
// targeted at that section. 219 real students carry a builder cohortId that differs from their
// academic cohort; matching only cohortId made those exams invisible to every one of them.
it("cohort targeting matches any active academic enrollment, not just the builder cohort", () => {
  const targeting = { mode: "filters", cohortIds: ["section-a"] };
  const student = { cohortId: "builder-cohort", cohortIds: ["section-a"], cohortNames: [] };
  assert.equal(studentMatchesTargeting(targeting, student), true);

  const other = { cohortId: "builder-cohort", cohortIds: ["section-b"], cohortNames: [] };
  assert.equal(studentMatchesTargeting(targeting, other), false);
});

it("cohort targeting still honours the engagement cohort for older exams", () => {
  const targeting = { mode: "filters", cohortIds: ["builder-cohort"] };
  const student = { cohortId: "builder-cohort", cohortIds: ["section-a"], cohortNames: [] };
  assert.equal(studentMatchesTargeting(targeting, student), true);
});

it("a student in several sections matches an exam for any one of them", () => {
  const targeting = { mode: "filters", cohortIds: ["section-c"] };
  const student = { cohortId: null, cohortIds: ["section-a", "section-c"], cohortNames: [] };
  assert.equal(studentMatchesTargeting(targeting, student), true);
});
