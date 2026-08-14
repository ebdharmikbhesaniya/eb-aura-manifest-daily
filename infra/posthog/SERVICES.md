# PostHog — Product/Service Catalog (what else exists)

**Compiled:** 2026-08-14 · from posthog.com/products, /pricing, /docs and per-product pages.
**Why this exists:** PostHog is ~22 products, all riding on the **same event stream** Aura already
collects. Adopting more is usually a config change, not a new pipeline. Aura uses **2** today
(Product Analytics + Feature Flags). This is the map of the rest.

**Visual version:** https://claude.ai/code/artifact/1a2a879f-74d0-4123-9a9c-414ac0253268

**Status legend:** ✅ in use · ★ recommended next · ○ available · 🌐 web-only (no React-Native) · β beta/alpha
**Pricing:** usage-based, no seat cost, generous per-product free tiers. Numbers are from the pricing
page at fetch time — **verify at posthog.com/pricing before budgeting.**

---

## Analytics

| Product               | Status    | RN?                | Free tier → rate            | What it does / Aura fit                                                                                            |
| --------------------- | --------- | ------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Product Analytics** | ✅ in use | ✅ (+ Node)        | 1M events/mo → $0.00005/ea  | Insight engine: Trends, Funnels, Retention, Paths, Lifecycle. Your dashboards run on it.                           |
| **Session Replay**    | ★ next    | ✅ screenshot-mode | 2.5k mobile/mo → $0.010/ea  | DVR playback of sessions + console/network/errors. GA on RN — **mask sensitive views** (Letter, journal).          |
| **Web Analytics**     | ○         | 🌐 web-only        | billed w/ Product Analytics | GA-style traffic dashboard. Only if Aura adds a marketing site.                                                    |
| **Group Analytics**   | ○         | ✅                 | paid add-on                 | Aggregate events by org/household. Low fit (consumer app). ⚠ Bills **all** identified events project-wide once on. |
| **Revenue Analytics** | β         | Stripe/events      | free · beta                 | MRR/growth metrics. RevenueCat already covers this.                                                                |
| **Heatmaps**          | ○         | 🌐 web-only        | no separate meter           | Click hotspots via Toolbar. Not on RN.                                                                             |

## Feature Management

| Product           | Status    | RN?                    | Free tier → rate             | What it does / Aura fit                                                                                                           |
| ----------------- | --------- | ---------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Feature Flags** | ✅ in use | ✅ (+ Node local-eval) | 1M requests/mo → $0.0001/ea  | % rollouts, targeting, multivariate, JSON payloads. Your 4 flags resolve here.                                                    |
| **Experiments**   | ★ next    | ✅                     | billed via Flags             | A/B/n with randomization + stats (Bayesian/frequentist, CUPED). Rides on flags you already wired — **lowest-friction next step.** |
| **Surveys**       | ★ next    | ✅                     | 1.5k responses/mo → $0.10/ea | In-app NPS/PMF/churn/open-text, targeted by event/flag/cohort. Post-Letter feeling check; churn reason at cancel.                 |

## Monitoring

| Product            | Status         | RN?                        | Free tier → rate                 | What it does / Aura fit                                                                                                                                                                                                                                                                              |
| ------------------ | -------------- | -------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Error Tracking** | ✅ implemented | ✅ JS autocapture (+ Node) | 100k exceptions/mo → $0.00037/ea | Auto-captures + groups exceptions into issues, source-mapped stacks, release tagging, links replay+events. **The Sentry replacement** — shipped (mobile autocapture + boundary, backend 5xx filter). Native crashes pending `@posthog/react-native-plugin`; source-map upload pending (plan task 6). |
| **Logs**           | β newer        | OTLP / backend             | separate pricing                 | OpenTelemetry log store, correlated with replays. Backend-side; nice-to-have.                                                                                                                                                                                                                        |

## AI

| Product                              | Status | RN?               | Free tier → rate        | What it does / Aura fit                                                                                                           |
| ------------------------------------ | ------ | ----------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **AI Observability** (LLM analytics) | ★ next | Node/OpenAI       | via events / AI credits | Captures every LLM call (prompt/response/tokens/cost/latency) into traces. Instrument the OpenAI **Letter generation** in NestJS. |
| **PostHog AI** (formerly Max)        | ○      | web app + Slack β | credits from $0.01      | In-app AI analyst — plain-English questions → insights/HogQL/dashboards. Enable AI data processing in org settings.               |

## Data & Infrastructure

| Product                  | Status  | RN?         | Free tier → rate             | What it does / Aura fit                                                                                               |
| ------------------------ | ------- | ----------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Managed Warehouse**    | ○       | infra       | 1M rows/mo → $0.000015/row   | Join Stripe/Postgres/HubSpot/files with events for unified SQL. Later: LTV-style questions.                           |
| **CDP / Data Pipelines** | ○       | infra       | 10k triggers/mo → $0.0005/ea | Sources → transformations → realtime destinations (Slack/CRM/webhooks) + batch exports. Route events out when needed. |
| **Endpoints**            | ○ newer | Node/client | usage-based                  | Publish a saved query as a cacheable API URL — for user-facing metrics (e.g. a streak).                               |
| **Workflows**            | β alpha | infra       | alpha                        | Trigger → conditions → dispatch (email/webhook/Slack). Overlaps Aura's own notifications; watch, don't adopt.         |

## Developer Tooling

| Product             | Status        | RN?          | Free tier → rate       | What it does / Aura fit                                                                                |
| ------------------- | ------------- | ------------ | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| **API + SQL/HogQL** | ✅ (indirect) | Node/analyst | bills against usage    | REST API + HogQL SQL Editor + Data Modeling + Notebooks. `provision.mjs`/`dashboards.mjs` use it.      |
| **Cohorts**         | ○             | server-side  | no separate meter      | Saved static/dynamic user groups to target flags/surveys/experiments. Free lever.                      |
| **MCP Server**      | ○             | dev tool     | free (AI credits some) | Drive PostHog from Claude Code/Cursor by NL. `npx @posthog/wizard mcp add`.                            |
| **CLI / Wizard**    | ✅ in use     | dev tool     | free                   | `posthog-cli` + `@posthog/wizard` — setup, MCP, source-map/symbol upload. You ran `posthog-cli login`. |
| **Toolbar**         | ○             | 🌐 web-only  | free                   | On-page overlay for actions/heatmaps/flag overrides. Not on RN.                                        |

---

## Recommended next-adoptions for Aura (value ÷ friction)

1. **Experiments** — zero new instrumentation; rides on existing flags. Lights up the `Aura · 3 Experiments` dashboard.
2. **Error Tracking** — RN crash autocapture + NestJS exceptions; 100k/mo free. Lights up the `$exception` tile. _(Plan: `docs/superpowers/plans/…-posthog-error-tracking.md`.)_
3. **Session Replay** — see the _why_ behind funnel drops; GA on RN (mind screenshot-mode masking). 2.5k mobile/mo free.
4. **Surveys** — qualitative signal events can't give; RN-supported. 1.5k responses/mo free.
5. **AI Observability** — instrument the OpenAI Letter generation in NestJS (cost/latency/quality).

## Caveats

- **RN Session Replay is screenshot-mode only** (not configurable) — masking sensitive UI is your responsibility.
- **Group Analytics billing trap** — bills every identified event project-wide once enabled.
- **Web-only** (no RN): Web Analytics, Heatmaps, Toolbar.
- **Naming drift**: "LLM analytics" = **AI Observability**; "Max"/"Max AI" = **PostHog AI**.
- **Beta/Alpha**: Revenue Analytics, Logs, AI-Observability custom parsers, PostHog AI in Slack, Workflows.
