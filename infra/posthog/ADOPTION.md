# PostHog Adoption Tracker

The live record of which PostHog services Aura has implemented, which are in
progress, and which are pending or intentionally skipped. Update this file as
each service lands. Catalog of everything available: [`SERVICES.md`](./SERVICES.md).

**Status:** ✅ implemented · 🟡 in progress · 🚧 blocked · ⬜ pending · ⛔ N/A (skip, with reason)

_Last updated: 2026-08-14_

## Progress

| #   | Service                  | Status                         | Where it lives                                                                                                                                                                                                                      | Commit(s)             |
| --- | ------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 1   | **Product Analytics**    | ✅ implemented                 | `apps/mobile/src/lib/analytics.ts`, `apps/backend/.../analytics.service.ts`, `packages/shared` catalog                                                                                                                              | `94e952e` and earlier |
| 2   | **Feature Flags**        | ✅ implemented                 | `apps/mobile/src/features/experiments/`                                                                                                                                                                                             | prior                 |
| 3   | **Experiments (A/B)**    | ✅ implemented (3/4 flags)     | `home.tsx`, `useHiddenScreens`, `flow.ts`                                                                                                                                                                                           | `f9c073f`, `61d11fa`  |
| 4   | **API + SQL/HogQL**      | ✅ implemented (provisioning)  | `infra/posthog/provision.mjs`, `dashboards.mjs`                                                                                                                                                                                     | `704dd22`, `187142e`  |
| 5   | **CLI / Wizard**         | ✅ implemented                 | `posthog-cli login` → `_cliAuth.mjs` fallback                                                                                                                                                                                       | `187142e`             |
| 6   | **Error Tracking**       | ✅ implemented                 | backend filter + `captureException`; mobile exception autocapture + `AppErrorBoundary` + `errorScrub`                                                                                                                               | `596cf26`, mobile     |
| 7   | **Session Replay**       | ⛔ skip (privacy)              | would screenshot the Letter / journal / name — breaches "content never leaves the device" (14 §privacy)                                                                                                                             | —                     |
| 8   | **Surveys**              | 🚧 blocked (SDK)               | needs `posthog-react-native` ≥4.6x (installed 4.57 has NO survey code) + `PostHogProvider` wiring + native rebuild. Rating/choice only when done — no open-text (14 §privacy). SDK can't enforce that; it's a survey-creation rule. | —                     |
| 9   | **AI Observability**     | ✅ implemented (metadata-only) | `generation.service.ts` `tracedGenerate` → `captureAiGeneration` ($ai_generation; no prompt/response)                                                                                                                               | _this batch_          |
| 10  | **Cohorts**              | ⬜ pending                     | PostHog UI config (no app code)                                                                                                                                                                                                     | —                     |
| 11  | **PostHog AI (Max)**     | ⬜ pending                     | enable AI data processing (org setting)                                                                                                                                                                                             | —                     |
| 12  | **MCP Server**           | ⬜ pending                     | dev-team editors (`@posthog/wizard mcp add`)                                                                                                                                                                                        | —                     |
| 13  | **Managed Warehouse**    | ⬜ pending                     | later — join Stripe/Postgres                                                                                                                                                                                                        | —                     |
| 14  | **CDP / Data Pipelines** | ⬜ pending                     | later — route events out                                                                                                                                                                                                            | —                     |
| 15  | **Endpoints**            | ⬜ pending                     | later — user-facing metrics                                                                                                                                                                                                         | —                     |
| —   | **Group Analytics**      | ⛔ skip                        | consumer app, no orgs; billing trap                                                                                                                                                                                                 | —                     |
| —   | **Revenue Analytics**    | ⛔ skip                        | RevenueCat already covers revenue                                                                                                                                                                                                   | —                     |
| —   | **Workflows**            | ⛔ skip (alpha)                | overlaps Aura's own notifications                                                                                                                                                                                                   | —                     |
| —   | **Web Analytics**        | ⛔ N/A                         | web-only; no marketing site                                                                                                                                                                                                         | —                     |
| —   | **Heatmaps**             | ⛔ N/A                         | web-only (no React Native)                                                                                                                                                                                                          | —                     |
| —   | **Toolbar**              | ⛔ N/A                         | web-only (no React Native)                                                                                                                                                                                                          | —                     |
| —   | **Logs**                 | ⛔ deferred                    | OTel backend; nice-to-have, not now                                                                                                                                                                                                 | —                     |

## Where things stand (code-integration services)

- ✅ **Error Tracking** — done (backend filter + mobile autocapture/boundary/scrub). Plan: [`docs/superpowers/plans/2026-08-14-posthog-error-tracking.md`](../../docs/superpowers/plans/2026-08-14-posthog-error-tracking.md). Remaining polish: native-crash plugin + source-map upload (plan task 6).
- ✅ **AI Observability** — done, metadata-only.
- ⛔ **Session Replay** — skipped (privacy).
- 🚧 **Surveys** — blocked on a `posthog-react-native` upgrade (4.57 → ≥4.6x) + provider wiring + native rebuild. Decision pending.
- 🧩 **Config-only (no repo code, do in PostHog UI/org):** Cohorts, PostHog AI (Max), MCP server, Managed Warehouse, CDP, Endpoints.

All app-code services that are feasible **and** compatible with Aura's "content never leaves the device" rule are now implemented. What remains is either a governance/UI action or the Surveys SDK upgrade.

## Changelog

- **2026-08-14** — **Surveys 🚧 blocked.** Installed `posthog-react-native@4.57` has no survey
  support (latest 4.63); needs an SDK upgrade + `PostHogProvider` wiring + native rebuild — deferred
  for a decision. Config-only services (Cohorts, PostHog AI, MCP, Warehouse, CDP, Endpoints) need no
  repo code. **All feasible + privacy-safe app-code services are now implemented.**
- **2026-08-14** — **AI Observability ✅ (metadata-only)** + **Session Replay ⛔ skipped.**
  Per privacy review: Session Replay would screenshot personal content (skipped);
  AI Observability ships `$ai_generation` with model/tokens/latency ONLY — the prompt
  (user memory) and response (the Letter) never leave the server. `generation.service.ts`
  wraps both LLM calls in `tracedGenerate`. Surveys next (rating/choice only).
- **2026-08-14** — **Error Tracking ✅ complete.** Mobile: exception + unhandled-rejection
  autocapture in `analytics.ts`, `captureException` export, `errorScrub` (before_send PII
  guard), root `AppErrorBoundary`. Backend already shipped (below). Next up: Session Replay.
- **2026-08-14** — Tracker created. Error Tracking started: backend `captureException`
  - global `AllExceptionsFilter` (5xx→PostHog, 4xx untouched, no message leak), 5 tests green.
