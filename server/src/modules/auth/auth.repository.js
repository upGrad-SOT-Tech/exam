import bcrypt from "bcryptjs";
import { getLmsDb } from "../../db/mongo.js";
import { normalizeEmail, AppError } from "../../shared/errors.js";

const SALT_ROUNDS = 12;

function students() {
  return getLmsDb().collection("students");
}

function candidates() {
  return getLmsDb().collection("candidates");
}

export async function findStudentByEmail(email) {
  return students().findOne({ email: normalizeEmail(email) });
}

export async function findCandidateByEmail(email) {
  return candidates().findOne({ email: normalizeEmail(email) });
}

export async function findAccountByEmail(email) {
  const normalized = normalizeEmail(email);
  const student = await findStudentByEmail(normalized);
  if (student) {
    return { accountType: "student", doc: student, collection: "students" };
  }
  const candidate = await findCandidateByEmail(normalized);
  if (candidate) {
    return { accountType: "candidate", doc: candidate, collection: "candidates" };
  }
  return null;
}

export async function verifyPassword(doc, password) {
  if (!doc?.passwordHash) return false;
  return bcrypt.compare(password, doc.passwordHash);
}

export async function setAccountPassword(email, password) {
  const account = await findAccountByEmail(email);
  if (!account) {
    throw new AppError("Account not found.", 404, "ACCOUNT_NOT_FOUND");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const now = new Date();
  const col = account.collection === "students" ? students() : candidates();

  await col.updateOne(
    { email: normalizeEmail(email) },
    { $set: { passwordHash, passwordUpdatedAt: now, updatedAt: now } },
  );

  return findAccountByEmail(email);
}

export function toPublicUser(doc, accountType) {
  if (!doc) return null;

  const profile = doc.profileSnapshot || {};
  const u = doc.userDetails || {};
  const s = doc.scholarshipRecord || {};

  const name =
    profile.name ||
    profile.fullName ||
    doc.name ||
    s.studentName ||
    s.candidateName ||
    u.fullName ||
    [u.firstName, u.lastName].filter(Boolean).join(" ") ||
    "Student";

  return {
    id: doc._id?.toString(),
    email: doc.email,
    role: accountType,
    name,
    fullName: profile.fullName || name,
    photoUrl: doc.profilePhoto?.url || profile.photoUrl || null,
    cohortId: doc.cohortId || null,
    cohortName: doc.cohortName || null,
    campus: doc.campus || profile.preferredCampus || null,
    programName: profile.programName || doc.programName || null,
  };
}
