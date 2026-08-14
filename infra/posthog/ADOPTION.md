# PostHog Adoption Tracker

The live record of which PostHog services Aura has implemented, which are in
progress, and which are pending or intentionally skipped. Update this file as
each service lands. Catalog of everything available: [`SERVICES.md`](./SERVICES.md).

**Status:** ✅ implemented · 🟡 in progress · ⬜ pending · ⛔ N/A (skip, with reason)

_Last updated: 2026-08-14_

## Progress

| #   | Service                  | Status                        | Where it lives                                                                                         | Commit(s)             |
| --- | ------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------- |
| 1   | **Product Analytics**    | ✅ implemented                | `apps/mobile/src/lib/analytics.ts`, `apps/backend/.../analytics.service.ts`, `packages/shared` catalog | `94e952e` and earlier |
| 2   | **Feature Flags**        | ✅ implemented                | `apps/mobile/src/features/experiments/`                                                                | prior                 |
| 3   | **Experiments (A/B)**    | ✅ implemented (3/4 flags)    | `home.tsx`, `useHiddenScreens`, `flow.ts`                                                              | `f9c073f`, `61d11fa`  |
| 4   | **API + SQL/HogQL**      | ✅ implemented (provisioning) | `infra/posthog/provision.mjs`, `dashboards.mjs`                                                        | `704dd22`, `187142e`  |
| 5   | **CLI / Wizard**         | ✅ implemented                | `posthog-cli login` → `_cliAuth.mjs` fallback                                                          | `187142e`             |
| 6   | **Error Tracking**       | ✅ implemented                | backend filter + `captureException`; mobile exception autocapture + `AppErrorBoundary` + `errorScrub`  | `596cf26`, mobile     |
| 7   | **Session Replay**       | ⬜ pending                    | mobile SDK config + masking                                                                            | —                     |
| 8   | **Surveys**              | ⬜ pending                    | mobile SDK + targeting                                                                                 | —                     |
| 9   | **AI Observability**     | ⬜ pending                    | backend OpenAI (Letter gen) instrumentation                                                            | —                     |
| 10  | **Cohorts**              | ⬜ pending                    | PostHog UI config (no app code)                                                                        | —                     |
| 11  | **PostHog AI (Max)**     | ⬜ pending                    | enable AI data processing (org setting)                                                                | —                     |
| 12  | **MCP Server**           | ⬜ pending                    | dev-team editors (`@posthog/wizard mcp add`)                                                           | —                     |
| 13  | **Managed Warehouse**    | ⬜ pending                    | later — join Stripe/Postgres                                                                           | —                     |
| 14  | **CDP / Data Pipelines** | ⬜ pending                    | later — route events out                                                                               | —                     |
| 15  | **Endpoints**            | ⬜ pending                    | later — user-facing metrics                                                                            | —                     |
| —   | **Group Analytics**      | ⛔ skip                       | consumer app, no orgs; billing trap                                                                    | —                     |
| —   | **Revenue Analytics**    | ⛔ skip                       | RevenueCat already covers revenue                                                                      | —                     |
| —   | **Workflows**            | ⛔ skip (alpha)               | overlaps Aura's own notifications                                                                      | —                     |
| —   | **Web Analytics**        | ⛔ N/A                        | web-only; no marketing site                                                                            | —                     |
| —   | **Heatmaps**             | ⛔ N/A                        | web-only (no React Native)                                                                             | —                     |
| —   | **Toolbar**              | ⛔ N/A                        | web-only (no React Native)                                                                             | —                     |
| —   | **Logs**                 | ⛔ deferred                   | OTel backend; nice-to-have, not now                                                                    | —                     |

## Order of implementation (code-integration services)

1. **Error Tracking** — plan: [`docs/superpowers/plans/2026-08-14-posthog-error-tracking.md`](../../docs/superpowers/plans/2026-08-14-posthog-error-tracking.md)
2. **Session Replay**
3. **Surveys**
4. **AI Observability**
5. **Cohorts** (config-only)

## Changelog

- **2026-08-14** — **Error Tracking ✅ complete.** Mobile: exception + unhandled-rejection
  autocapture in `analytics.ts`, `captureException` export, `errorScrub` (before_send PII
  guard), root `AppErrorBoundary`. Backend already shipped (below). Next up: Session Replay.
- **2026-08-14** — Tracker created. Error Tracking started: backend `captureException`
  - global `AllExceptionsFilter` (5xx→PostHog, 4xx untouched, no message leak), 5 tests green.
