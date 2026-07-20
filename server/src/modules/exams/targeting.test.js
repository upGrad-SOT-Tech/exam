import test from "node:test";
import assert from "node:assert/strict";

// targeting.js pulls in db/mongo.js → config/env.js, which validates process.env on import.
// Provide the minimum so the module loads; these tests only exercise the pure matcher.
process.env.MONGODB_URI ||= "mongodb://localhost";
process.env.JWT_ACCESS_SECRET ||= "test-secret-0123456789abcdef";
process.env.JWT_REFRESH_SECRET ||= "test-secret-0123456789abcdef";

const { studentMatchesTargeting } = await import("./targeting.js");

test("mode 'all' assigns everyone", () => {
  assert.equal(studentMatchesTargeting({ email: "a@x.com" }, { mode: "all" }), true);
});

test("missing targeting (e.g. the seed exam) assigns everyone", () => {
  assert.equal(studentMatchesTargeting({ email: "a@x.com" }, undefined), true);
});

test("cohort targeting matches only the assigned cohorts", () => {
  const targeting = { mode: "filters", cohortIds: ["c1", "c2"] };
  assert.equal(studentMatchesTargeting({ cohortId: "c2" }, targeting), true);
  assert.equal(studentMatchesTargeting({ cohortId: "c9" }, targeting), false);
});

test("individuals targeting matches by email, case-insensitively", () => {
  const targeting = { mode: "individuals", studentEmails: ["Me@X.com"] };
  assert.equal(studentMatchesTargeting({ email: "me@x.com" }, targeting), true);
  assert.equal(studentMatchesTargeting({ email: "other@x.com" }, targeting), false);
});

test("filter dimensions AND together — a cohort mismatch hides the exam even if campus matches", () => {
  const targeting = { mode: "filters", campuses: ["ADYPU"], cohortIds: ["c1"] };
  assert.equal(studentMatchesTargeting({ campus: "ADYPU", cohortId: "c1" }, targeting), true);
  assert.equal(studentMatchesTargeting({ campus: "ADYPU", cohortId: "c9" }, targeting), false);
});

test("program and batch are matched case-insensitively", () => {
  const targeting = { mode: "filters", programs: ["B.Tech CSE"], batches: ["2026"] };
  assert.equal(studentMatchesTargeting({ programName: "b.tech cse", batch: "2026" }, targeting), true);
  assert.equal(studentMatchesTargeting({ programName: "B.Tech ECE", batch: "2026" }, targeting), false);
});
