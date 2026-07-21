import { z } from "zod";
import { env } from "../../config/env.js";
import * as authService from "./auth.service.js";
import { redeemLaunchCode } from "./sso.service.js";

const emailSchema = z.object({
  email: z.string().trim().email(),
});

const passwordLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

const otpLoginSchema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().min(4).max(8),
});

const sendOtpSchema = z.object({
  email: z.string().trim().email(),
  purpose: z.enum(["login", "set-password", "reset-password"]),
});

const setPasswordSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  otp: z.string().trim().min(4).max(8),
});

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.NODE_ENV === "production",
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setRefreshCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, COOKIE_OPTS);
}

function clearRefreshCookie(res) {
  res.clearCookie("refreshToken", { path: "/api/auth" });
}

export async function lookup(req, res, next) {
  try {
    const { email } = emailSchema.parse(req.body);
    res.json(await authService.lookupEmail(email));
  } catch (err) {
    next(err);
  }
}

export async function sendOtp(req, res, next) {
  try {
    const { email, purpose } = sendOtpSchema.parse(req.body);
    res.json(await authService.sendAuthOtp(email, purpose));
  } catch (err) {
    next(err);
  }
}

export async function loginPassword(req, res, next) {
  try {
    const { email, password } = passwordLoginSchema.parse(req.body);
    const data = await authService.loginWithPassword(email, password);
    setRefreshCookie(res, data.refreshToken);
    const { refreshToken: _, ...payload } = data;
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function loginOtp(req, res, next) {
  try {
    const { email, code } = otpLoginSchema.parse(req.body);
    const data = await authService.loginWithOtp(email, code);
    setRefreshCookie(res, data.refreshToken);
    const { refreshToken: _, ...payload } = data;
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function setPassword(req, res, next) {
  try {
    const { email, password, otp } = setPasswordSchema.parse(req.body);
    const data = await authService.setPasswordAndLogin(email, password, otp);
    setRefreshCookie(res, data.refreshToken);
    const { refreshToken: _, ...payload } = data;
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { email, password, otp } = setPasswordSchema.parse(req.body);
    res.json(await authService.resetPassword(email, password, otp));
  } catch (err) {
    next(err);
  }
}

const ssoExchangeSchema = z.object({
  code: z.string().trim().min(20).max(200),
});

/**
 * Redeems a one-time LMS launch code for a session here — the student clicked their exam in the
 * LMS and the OS handed us `upgradexam://launch?code=…`, so they never sign in twice.
 */
export async function ssoExchange(req, res, next) {
  try {
    const { code } = ssoExchangeSchema.parse(req.body);
    const data = await redeemLaunchCode(code);
    setRefreshCookie(res, data.refreshToken);
    const { refreshToken: _, ...payload } = data;
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await authService.getMe(req.user.email);
    res.json({ user, role: req.user.role });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const tokens = await authService.refreshSession(refreshToken);
    setRefreshCookie(res, tokens.refreshToken);
    res.json({ accessToken: tokens.accessToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    await authService.logout(refreshToken);
    clearRefreshCookie(res);
    res.json({ loggedOut: true });
  } catch (err) {
    next(err);
  }
}
