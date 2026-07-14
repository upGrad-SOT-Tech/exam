import crypto from "crypto";
import nodemailer from "nodemailer";
import { env } from "../../config/env.js";
import { getLmsDb } from "../../db/mongo.js";
import { AppError, normalizeEmail } from "../../shared/errors.js";

function otpCollection() {
  return getLmsDb().collection("otp_sessions");
}

function generateCode() {
  const max = 10 ** env.OTP_LENGTH;
  return String(crypto.randomInt(0, max)).padStart(env.OTP_LENGTH, "0");
}

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code).trim()).digest("hex");
}

function getTransporter() {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    service: env.EMAIL_SERVICE || "gmail",
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS.replace(/\s+/g, ""),
    },
  });
}

async function sendOtpEmail({ to, code, purpose }) {
  const transporter = getTransporter();
  const subject =
    purpose === "reset-password"
      ? "Reset your password"
      : purpose === "set-password"
        ? "Verify your account"
        : "Your login code";

  if (!transporter) {
    console.log(`[otp] ${purpose} for ${to}: ${code}`);
    return;
  }

  await transporter.sendMail({
    from: env.EMAIL_FROM || env.EMAIL_USER,
    to,
    subject: `${subject} | upGrad School of Technology`,
    text: `Your verification code is ${code}. It expires in ${env.OTP_EXPIRES_MINUTES} minutes.`,
    html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in ${env.OTP_EXPIRES_MINUTES} minutes.</p>`,
  });
}

export async function createAndSendOtp({ email, purpose }) {
  const normalized = normalizeEmail(email);
  const code = generateCode();
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000);

  await otpCollection().deleteMany({ email: normalized, purpose });
  await otpCollection().insertOne({
    email: normalized,
    purpose,
    codeHash: hashCode(code),
    expiresAt,
    createdAt: new Date(),
    attempts: 0,
    client: "electron",
  });

  await sendOtpEmail({ to: normalized, code, purpose });
  return { expiresInMinutes: env.OTP_EXPIRES_MINUTES };
}

export async function verifyOtp({ email, code, purpose }) {
  const normalized = normalizeEmail(email);
  const session = await otpCollection().findOne({ email: normalized, purpose });

  if (!session) {
    throw new AppError("OTP expired or not found. Request a new code.", 400, "OTP_NOT_FOUND");
  }
  if (session.expiresAt < new Date()) {
    await otpCollection().deleteOne({ _id: session._id });
    throw new AppError("OTP has expired. Request a new code.", 400, "OTP_EXPIRED");
  }
  if (session.attempts >= 5) {
    throw new AppError("Too many attempts. Request a new code.", 429, "OTP_LOCKED");
  }

  if (session.codeHash !== hashCode(code)) {
    await otpCollection().updateOne({ _id: session._id }, { $inc: { attempts: 1 } });
    throw new AppError("Invalid verification code.", 400, "OTP_INVALID");
  }

  await otpCollection().deleteOne({ _id: session._id });
  return true;
}
