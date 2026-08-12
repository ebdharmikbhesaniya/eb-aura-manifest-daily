# PostHog — Runbook & History (Aura)

**Created:** 2026-08-10
**What this is:** the single source of truth for Aura's PostHog analytics + feature-flags + experiments. It records **what** exists, **where** it lives in the code, **how** to reproduce it, and **why** each piece is there — so you can stand the same thing up in **production** deliberately, from a record, not from memory. Everything here is config-as-code (`provision.mjs`) or typed code in the app; nothing important is a manual UI click.

> **The golden rule:** every experiment's `control` variant is the **current shipped behaviour, byte-for-byte**. A flag that never loads (offline, not yet created, disabled) falls back to control. So provisioning and flags can never, by themselves, change what a user sees — only ramping a variant does.

---

## 0. TL;DR — the happy path

```bash
# 1. Local PostHog (best-effort — see §1 for the honest caveats)
cd infra/posthog && ./up.sh              # http://localhost:8000, wait for migrations

# 2. Create the project in the UI, then grab two keys:
#    - project ingestion key  (phc_…)  → the app
#    - personal API key       (phx_…)  → provisioning
cp .env.example .env && $EDITOR .env     # fill POSTHOG_* for provisioning

# 3. Provision flags + dashboards (idempotent; same command for prod)
node provision.mjs

# 4. Point the app at it
#    apps/mobile/.env.local:
#      EXPO_PUBLIC_POSTHOG_KEY=phc_...
#      EXPO_PUBLIC_POSTHOG_HOST=http://localhost:8000
```

---

## ⚠️ 1a. Incident 2026-08-10 — the local pull filled the disk

Attempting the local stack on this machine (~29G free, disk already 90% full) drove disk to **96% (12G free)** mid-pull, which **stopped the local Supabase containers**; cleanup then removed them. **No data was lost** (Supabase volumes are untouched by pruning); Supabase was restored with `npx supabase start`. Lessons, now enforced:

- **`up.sh` refuses to start unless ≥25G is free** — a hard guard against a repeat.
- PostHog's stack needs **~10–15G of images + growing ClickHouse data**. Do NOT run it on a disk-constrained machine.
- **Recommended:** use **PostHog Cloud** (free tier). The app code, `provision.mjs`, and `smoke.mjs` all work against Cloud unchanged — that was always the point of building instance-agnostic.
- To reclaim space for a local run, `docker system prune -a` removes UNUSED images (review first — it deletes images not currently used by a running container).

## 1. Running PostHog locally — the honest picture

Modern PostHog is **not** a single container. It is a ~15-service mesh (Postgres, ClickHouse, Kafka, Zookeeper, Redis, MinIO, plus dedicated `feature-flags`, `capture`, `personhog`, `hypercache`, `temporal`, `cyclotron` services and a Caddy TLS proxy). The official self-host (`docker-compose.hobby.yml`) is built for a VM **with a domain**, not clean `localhost`.

Consequences (learned 2026-08-10):

- A hand-rolled lean compose (`docker-compose.yml` here) starts the datastores but the modern PostHog app image + flag service won't fully serve flags without the rest of the mesh. It's kept as a **datastore/dev scaffold**, not a faithful instance.
- **Recommended faithful local run:** PostHog's official hobby installer, which orchestrates the full stack in Docker:
  ```bash
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/posthog/posthog/HEAD/bin/deploy-hobby)"
  # When prompted for a domain, use `localhost`; it brings up the full compose.
  ```
- **Lightest & closest to prod:** a free **PostHog Cloud** project. `provision.mjs` + the app env don't care whether the host is local or cloud — that's the point.

**Disk note:** your machine was at ~90% (29G free). The full stack + ClickHouse data will eat several GB; watch `df -h` and `./down.sh --volumes` to reclaim it.

---

## 2. What the app does with PostHog (code map)

| Concern                    | Where                                                                | Notes                                                                                                             |
| -------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| SDK init + host            | `apps/mobile/src/lib/analytics.ts` `initAnalytics`                   | Passes `host` from `EXPO_PUBLIC_POSTHOG_HOST` (Cloud US if unset). Autocapture OFF.                               |
| Typed event capture        | `analytics.capture` + `packages/shared/src/events/types.ts`          | Catalog-only, no free text, no PII — enforced by the type system.                                                 |
| Read a flag                | `analytics.getFeatureFlag` / `reloadFeatureFlags` / `onFeatureFlags` | The ONLY SDK-flag surface.                                                                                        |
| Read an experiment variant | `apps/mobile/src/features/experiments/useVariant.ts`                 | `useVariant(key, 'control', variants)` / `useFeatureFlag(key)`. Defaults to control; refreshes when flags arrive. |
| Flag key registry          | `apps/mobile/src/features/experiments/keys.ts`                       | `EXPERIMENTS` — one typed home for every key. Must match `provision.mjs` + this runbook.                          |
| Bootstrap flags            | `apps/mobile/src/hooks/useBoot.ts`                                   | `reloadFeatureFlags()` after `identify`, best-effort (never delays boot).                                         |
| GA4 fan-out                | `analytics.ts` `GA4_EVENT_NAMES`                                     | `onboarding_completed`, `purchase` only — for ad attribution, name-only, no payload.                              |

---

## 3. Feature flags & experiments (the catalog)

Provisioned by `provision.mjs`. All created **active at 100% control**, so nothing changes until you ramp.

| Flag key                 | Registry                           | Variants (control first)                             | Gated in code?                                          | Why                                                                  |
| ------------------------ | ---------------------------------- | ---------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| `onboarding-dream-home`  | `EXPERIMENTS.onboardingDreamHome`  | `control` = shown · `off` = hidden                   | **Not yet** — dream-home ships unconditionally (see §5) | Depth converts (Glow); test whether the 7th question helps or hurts. |
| `onboarding-commit-beat` | `EXPERIMENTS.onboardingCommitBeat` | `control` = shown · `off` = hidden                   | **Not yet**                                             | Isolate the commitment beat's lift on trial-start.                   |
| `home-first-run`         | `EXPERIMENTS.homeFirstRun`         | `control` = shown · `off` = hidden                   | **Not yet**                                             | Isolate first-run activation's lift on trial→paid / retention.       |
| `paywall-layout`         | `EXPERIMENTS.paywallLayout`        | `control` = single trial-timeline · `steps` = 3-step | **Not yet** (steps variant not built)                   | Test single rich screen vs Glow's one-info-per-screen sequence.      |

> **"Not yet" is deliberate.** The three onboarding changes shipped straight (they ARE today's control). The flags exist so you can turn each into a real A/B with a one-line gate (§5) whenever you choose — the tracking + infra are ready now, the gating is the "run the experiment" step.

---

## 4. Events (the funnel)

All typed in `packages/shared/src/events/types.ts`. Existing funnel events (already fired): `onboarding_started`, `onboarding_screen_viewed`, `onboarding_answer_submitted`, `onboarding_completed`, `paywall_viewed`, `paywall_dismissed`, `purchase_completed`, `trial_started`.

**Added 2026-08-10** (with where they fire):

| Event                                           | Fires at                                            | Why                                                                    |
| ----------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| `trial_started` (existed; now also client-side) | `app/paywall.tsx` `onPurchase` when `plan.hasTrial` | Immediate trial-start attribution; RC webhook is the server authority. |
| `commitment_accepted`                           | `screens/S13Commit.tsx` on "I'm ready"              | The commit beat's exposure→intent step.                                |
| `firstrun_welcome_shown`                        | `app/(tabs)/home.tsx` mount when the card shows     | Top of the activation funnel.                                          |
| `firstrun_welcome_dismissed`                    | `home.tsx` `onDismissFirstRun`                      | Activation completion.                                                 |
| `notification_permission_result {granted}`      | `useNotifications.requestPermissionAndRegister`     | Opt-in rate (both S12 and the second chance).                          |
| `notification_second_chance_viewed`             | `S12NotificationsMore` mount                        | Second-chance reach + conversion.                                      |

Exposure attribution for experiments is PostHog's native `$feature_flag_called` (emitted automatically when `getFeatureFlag`/`useVariant` reads a flag) — no custom event needed.

---

## 5. How to actually run an experiment (control = current)

Each onboarding flag needs a **one-line gate** added when you decide to run it. Pattern (dream-home shown):

```ts
// flow.ts — make SCREEN_ORDER a function of the variant
import { useVariant } from '@/features/experiments/useVariant';
import { EXPERIMENTS } from '@/features/experiments/keys';
// in the resume/host that builds the flow:
const v = useVariant(EXPERIMENTS.onboardingDreamHome, 'control', ['control', 'off']);
const order = v === 'off' ? SCREEN_ORDER.filter((s) => s !== 's07-dream-home') : SCREEN_ORDER;
```

For `home-first-run` / `onboarding-commit-beat` it's even simpler — wrap the render/insertion in `useVariant(...) === 'control'`. **Keep control === today's behaviour.**

Then: in PostHog, create an **Experiment** on the flag with a goal metric (e.g. `trial_started` for the paywall/commit ones, `onboarding_completed` + `trial_started` for dream-home), ramp the non-control variant to 50%, and decide on **conversion/revenue**, not completion, at the sample threshold (~300 users / ~50 conversions per arm). Then delete the losing path.

---

## 6. Replicating in PRODUCTION (the plan)

1. **Create/confirm the prod PostHog project** (Cloud or self-host). Note the ingestion key (`phc_…`) and project id.
2. **App env (prod build):** set `EXPO_PUBLIC_POSTHOG_KEY` (and `EXPO_PUBLIC_POSTHOG_HOST` if not Cloud US) in `apps/mobile/eas.json` `base.env`. Rebuild.
3. **Provision:** create a personal API key (`phx_…`, scopes in §0), then:
   ```bash
   POSTHOG_HOST=https://us.i.posthog.com POSTHOG_PROJECT_ID=<id> \
   POSTHOG_PERSONAL_API_KEY=phx_... node infra/posthog/provision.mjs
   ```
   Idempotent — safe to re-run after adding flags/insights.
4. **Verify** events land (Activity → Live events) and the dashboard populates.
5. **Run experiments** per §5, one at a time.

Keep this runbook + `provision.mjs` the source of truth: **add a flag → add it to `keys.ts` → add it to `provision.mjs` → document it here**, in that order.

---

## 7. Change log / history

- **2026-08-10** — Initial setup.
  - Added `EXPO_PUBLIC_POSTHOG_HOST` (`env.ts`) so the app targets any instance.
  - Added flag reads (`getFeatureFlag`/`reloadFeatureFlags`/`onFeatureFlags`) to `analytics.ts`; bootstrap in `useBoot`.
  - Added `useVariant`/`useFeatureFlag` + `EXPERIMENTS` registry (`features/experiments/`) + tests.
  - Added events: `commitment_accepted`, `firstrun_welcome_shown`, `firstrun_welcome_dismissed`; wired client-side `trial_started` on trial purchase.
  - Added `infra/posthog/`: lean dev compose + `up.sh`/`down.sh`, `provision.mjs` (4 flags + 3-insight funnel dashboard), `.env.example`, this runbook.
  - Added `smoke.mjs` — validates the app's exact integration (capture via `/i/v0/e/`, flags via `/flags`) against any instance with the project key.
  - Attempted a local bring-up; documented the modern-mesh reality (§1) and the recommended faithful paths (official hobby installer / Cloud). No faithful local instance stood up in the sandbox; artifacts are instance-agnostic by design.
  - **Incident (§1a):** a second attempt (monolith image + Redpanda + ClickHouse) filled the disk to 96% and stopped local Supabase. Stopped the pull, cleaned up PostHog resources, restored Supabase (`npx supabase start`, no data loss). Added a ≥25G disk guard to `up.sh`. Conclusion: run PostHog on **Cloud** (or a machine with real disk headroom), not this one.
