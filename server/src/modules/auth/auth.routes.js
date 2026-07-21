import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import * as authController from "./auth.controller.js";

const router = Router();

router.post("/lookup", authController.lookup);
router.post("/send-otp", authController.sendOtp);
router.post("/login/password", authController.loginPassword);
router.post("/login/otp", authController.loginOtp);
router.post("/set-password", authController.setPassword);
// SSO handoff from the LMS deep link — trades a one-time launch code for a session here.
router.post("/sso/exchange", authController.ssoExchange);
router.post("/reset-password", authController.resetPassword);
router.get("/me", requireAuth, authController.me);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

export default router;
