/** Parsed `upgradexam://launch?code=…&examId=…` handoff from the LMS. */
export type DeepLinkPayload = {
  /** URL host segment — "launch" today; future actions can reuse the same channel. */
  action: string
  /** One-time SSO code, redeemed via POST /api/auth/sso/exchange. Single-use, ~2 min TTL. */
  code: string | null
  /** The exam the student clicked in the LMS, so we can land them straight on it. */
  examId: string | null
}
