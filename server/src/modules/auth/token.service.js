import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { getLmsDb } from "../../db/mongo.js";
import { normalizeEmail } from "../../shared/errors.js";

function refreshCollection() {
  return getLmsDb().collection("refresh_tokens");
}

export function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

export async function issueTokenPair({ sub, role, email }) {
  const accessToken = signAccessToken({ sub, role, email });
  const refreshToken = crypto.randomBytes(48).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await refreshCollection().insertOne({
    tokenHash,
    sub,
    role,
    email: normalizeEmail(email),
    expiresAt,
    createdAt: new Date(),
    client: "electron",
  });

  return { accessToken, refreshToken };
}

export async function rotateRefreshToken(refreshToken) {
  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const stored = await refreshCollection().findOne({ tokenHash });

  if (!stored || stored.expiresAt < new Date()) return null;

  await refreshCollection().deleteOne({ _id: stored._id });

  return issueTokenPair({
    sub: stored.sub,
    role: stored.role,
    email: stored.email,
  });
}

export async function revokeRefreshToken(refreshToken) {
  if (!refreshToken) return;
  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  await refreshCollection().deleteOne({ tokenHash });
}

export async function revokeRefreshTokensForEmail(email) {
  if (!email) return;
  await refreshCollection().deleteMany({ email: normalizeEmail(email) });
}
