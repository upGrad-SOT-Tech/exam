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
