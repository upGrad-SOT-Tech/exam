import { AppError, normalizeEmail } from "../../shared/errors.js";
import {
  findAccountByEmail,
  setAccountPassword,
  toPublicUser,
  verifyPassword,
} from "./auth.repository.js";
import { createAndSendOtp, verifyOtp } from "./otp.service.js";
import {
  issueTokenPair,
  revokeRefreshToken,
  revokeRefreshTokensForEmail,
  rotateRefreshToken,
} from "./token.service.js";

const UNAUTHORIZED_MSG = "You are not authorised to access this platform";
const HOME_ROUTE = "/home";

async function requireAccount(email) {
  const normalized = normalizeEmail(email);
  const account = await findAccountByEmail(normalized);
  if (!account) {
    throw new AppError(UNAUTHORIZED_MSG, 403, "NOT_AUTHORIZED");
  }
  return { normalized, ...account };
}

export async function lookupEmail(email) {
  const { normalized, accountType, doc } = await requireAccount(email);

  return {
    accountType,
    email: normalized,
    existsInLms: true,
    firstTime: !doc.passwordHash,
    hasPassword: Boolean(doc.passwordHash),
    profile: toPublicUser(doc, accountType),
  };
}

export async function sendAuthOtp(email, purpose) {
  const allowed = new Set(["login", "set-password", "reset-password"]);
  if (!allowed.has(purpose)) {
    throw new AppError("Invalid OTP purpose.", 400, "INVALID_PURPOSE");
  }

  const { normalized, doc } = await requireAccount(email);

  if (purpose === "login" && !doc.passwordHash) {
    throw new AppError("Please create your password first.", 400, "PASSWORD_SETUP_REQUIRED");
  }
  if (purpose === "set-password" && doc.passwordHash) {
    throw new AppError("Password already set. Use forgot password instead.", 400, "PASSWORD_EXISTS");
  }
  if (purpose === "reset-password" && !doc.passwordHash) {
    throw new AppError("No password exists. Please create your password first.", 400, "PASSWORD_NOT_SET");
  }

  return createAndSendOtp({ email: normalized, purpose });
}

export async function loginWithPassword(email, password) {
  const { normalized, accountType, doc } = await requireAccount(email);

  if (!doc.passwordHash) {
    throw new AppError(
      "You have not set a password yet. Please create your password first.",
      400,
      "PASSWORD_NOT_SET",
    );
  }

  const valid = await verifyPassword(doc, password);
  if (!valid) {
    throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
  }

  const tokens = await issueTokenPair({
    sub: doc._id.toString(),
    role: accountType,
    email: normalized,
  });

  return {
    ...tokens,
    role: accountType,
    user: toPublicUser(doc, accountType),
    redirectTo: HOME_ROUTE,
  };
}

export async function loginWithOtp(email, code) {
  const { normalized, accountType, doc } = await requireAccount(email);

  if (!doc.passwordHash) {
    throw new AppError("Please create your password first.", 400, "PASSWORD_SETUP_REQUIRED");
  }

  await verifyOtp({ email: normalized, code, purpose: "login" });

  const tokens = await issueTokenPair({
    sub: doc._id.toString(),
    role: accountType,
    email: normalized,
  });

  return {
    ...tokens,
    role: accountType,
    user: toPublicUser(doc, accountType),
    redirectTo: HOME_ROUTE,
  };
}

export async function setPasswordAndLogin(email, password, otp) {
  const { normalized, accountType, doc } = await requireAccount(email);

  if (doc.passwordHash) {
    throw new AppError("Password already set. Sign in or reset password.", 400, "PASSWORD_EXISTS");
  }

  await verifyOtp({ email: normalized, code: otp, purpose: "set-password" });
  const updated = await setAccountPassword(normalized, password);

  const tokens = await issueTokenPair({
    sub: updated.doc._id.toString(),
    role: updated.accountType,
    email: normalized,
  });

  return {
    ...tokens,
    role: updated.accountType,
    user: toPublicUser(updated.doc, updated.accountType),
    redirectTo: HOME_ROUTE,
  };
}

export async function resetPassword(email, password, otp) {
  const { normalized, doc } = await requireAccount(email);

  if (!doc.passwordHash) {
    throw new AppError(
      "No password exists for this account. Please create your password first.",
      400,
      "PASSWORD_NOT_SET",
    );
  }

  await verifyOtp({ email: normalized, code: otp, purpose: "reset-password" });
  await setAccountPassword(normalized, password);
  await revokeRefreshTokensForEmail(normalized);

  return { passwordReset: true };
}

export async function getMe(email) {
  const { accountType, doc } = await requireAccount(email);
  return toPublicUser(doc, accountType);
}

export async function refreshSession(refreshToken) {
  if (!refreshToken) {
    throw new AppError("Refresh token required", 401, "UNAUTHORIZED");
  }
  const tokens = await rotateRefreshToken(refreshToken);
  if (!tokens) {
    throw new AppError("Invalid or expired refresh token", 401, "UNAUTHORIZED");
  }
  return tokens;
}

export async function logout(refreshToken) {
  await revokeRefreshToken(refreshToken);
  return { loggedOut: true };
}
