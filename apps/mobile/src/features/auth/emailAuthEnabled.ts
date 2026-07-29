/**
 * Master switch for email-based auth.
 *
 * When `false`, the app offers ONLY Google and Apple sign-in: the gate hides its
 * "create account" / "sign in with email" buttons, and the sign-in sheet hides
 * its magic-link option. Everything behind them — the password screens, the
 * magic-link flow, `password.ts`, `session.ts` and the `authCopy.gate.password`
 * copy — is deliberately left in place so this can be turned back on with no
 * other change.
 *
 * Turned OFF for launch (founder decision, 2026-07-29): Google + Apple only.
 * Flip to `true` to restore email/password + magic-link sign-in.
 *
 * Typed `boolean` (not the literal `false`) on purpose: it keeps the gated JSX
 * from being seen as statically dead by TypeScript / lint.
 */
export const EMAIL_AUTH_ENABLED: boolean = false;
