# PostHog — Runbook & History (Aura)

**Created:** 2026-08-10
**What this is:** the single source of truth for Aura's PostHog analytics + feature-flags + experiments. It records **what** exists, **where** it lives in the code, **how** to reproduce it, and **why** each piece is there — so you can stand the same thing up in **production** deliberately, from a record, not from memory. Everything here is config-as-code (`provision.mjs`) or typed code in the app; nothing important is a manual UI click.

> **The golden rule:** every experiment's `control` variant is the **current shipped behaviour, byte-for-byte**. A flag that never loads (offline, not yet created, disabled) falls back to control. So provisioning and flags can never, by themselves, change what a user sees — only ramping a variant does.

---

## 0. TL;DR — the happy path

A **faithful** local PostHog now runs from this directory's compose (proven 2026-08-13: the app's exact capture + flags paths work). Only PostHog is local; Supabase/backend/RevenueCat stay remote.

```bash
# 1. Bring up local PostHog (first boot pulls images + migrates, ~3–5 min).
#    up.sh guards disk headroom and extracts the GeoIP DB the flags service needs.
cd infra/posthog && ./up.sh              # http://localhost:8000

# 2. First-run setup — create the org/user/project + print the project key (phc_).
POSTHOG_HOST=http://localhost:8000 node bootstrap.mjs

# 3. Provision flags + funnel dashboard (idempotent; SAME command for prod).
#    Needs a personal API key (phx_); mint one — bootstrap can't (see §1c):
#      docker compose -p aura-posthog exec -T web python manage.py shell -c \
#        "from posthog.models.personal_api_key import PersonalAPIKey, hash_key_value; \
#         from posthog.models.utils import generate_random_token_personal; \
#         from posthog.models import User; u=User.objects.get(email='dev@aura.local'); \
#         v=generate_random_token_personal(); \
#         PersonalAPIKey.objects.create(user=u,label='aura-provision',secure_value=hash_key_value(v),mask_value=v[:8],scopes=['*']); \
#         print('KEY='+v)"
POSTHOG_HOST=http://localhost:8000 POSTHOG_PROJECT_ID=1 \
  POSTHOG_PERSONAL_API_KEY=phx_... node provision.mjs

# 4. Verify the app's integration end-to-end (capture + flags over one origin).
POSTHOG_HOST=http://localhost:8000 POSTHOG_PROJECT_API_KEY=phc_... node smoke.mjs

# 5. Point the app at it — apps/mobile/.env.local (host must be reachable FROM the
#    device: LAN IP for a physical device, 10.0.2.2 for Android emulator, localhost
#    for iOS sim):
#      EXPO_PUBLIC_POSTHOG_KEY=phc_...
#      EXPO_PUBLIC_POSTHOG_HOST=http://<host>:8000
```

---

## ⚠️ 1a. Incident 2026-08-10 — the local pull filled the disk

Attempting the local stack on this machine (~29G free, disk already 90% full) drove disk to **96% (12G free)** mid-pull, which **stopped the local Supabase containers**; cleanup then removed them. **No data was lost** (Supabase volumes are untouched by pruning); Supabase was restored with `npx supabase start`. Lessons, now enforced:

- **`up.sh` refuses to start unless ≥25G is free** — a hard guard against a repeat.
- PostHog's stack needs **~10–15G of images + growing ClickHouse data**. Do NOT run it on a disk-constrained machine.
- **Recommended:** use **PostHog Cloud** (free tier). The app code, `provision.mjs`, and `smoke.mjs` all work against Cloud unchanged — that was always the point of building instance-agnostic.
- To reclaim space for a local run, `docker system prune -a` removes UNUSED images (review first — it deletes images not currently used by a running container).

## 1. Running PostHog locally — the working architecture

Modern PostHog is **not** a single container: `posthog/posthog:latest` is a Django image that serves only the **UI + REST API**. In PostHog's service split, the two paths the app actually uses were moved into dedicated Rust services. Our `docker-compose.yml` runs exactly the subset the app depends on, behind a small Caddy front door so the app sees **one origin** just like Cloud:

| Service         | Image                                                                       | Owns                                                         |
| --------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `caddy`         | `caddy:2-alpine`                                                            | Front door `:8000` → routes each path (Caddyfile)            |
| `web`           | `posthog/posthog:latest`                                                    | UI + REST API (`/`, `/api/*`)                                |
| `worker`        | `posthog/posthog:latest`                                                    | Celery async jobs (not in the app's path)                    |
| `capture`       | `ghcr.io/posthog/posthog/capture:master`                                    | Event ingest: `/e`, `/i/v0`, `/batch`, `/capture` → Kafka    |
| `feature-flags` | `ghcr.io/posthog/posthog/feature-flags:master`                              | Flag resolution: `/flags`, local-evaluation (reads Postgres) |
| `migrate`       | `posthog/posthog:latest` (one-shot)                                         | Postgres + ClickHouse schema, then exits                     |
| datastores      | postgres 15, clickhouse **26.6**, redpanda (Kafka), zookeeper, redis, minio | state                                                        |

**Proven 2026-08-13:** `smoke.mjs` passes over `:8000` — capture returns 200 and all 4 provisioned flags resolve, via both `localhost` and the LAN IP a device would use.

### 1b. What we deliberately DON'T run (and the consequence)

**Event ingestion** — moving captured events from Kafka _into ClickHouse_ — is a separate `-node` plugin-server / ingestion mesh (`ingestion-general`, etc.) that the app does **not** depend on. So: captured events reach Kafka and 200 the SDK (the SDK's whole contract), but **won't appear in Activity / insights** locally without that mesh. Feature flags and event _acceptance_ — the app's real dependencies — work fully. If you need events visible in the UI, add PostHog's ingestion node image from `docker-compose.hobby.yml`.

Also omitted (not needed for the app): `personhog`, `hypercache`, `temporal`, `cyclotron`, `replay-capture`, `capture-ai`, `browserless`, and Caddy TLS (we serve plain HTTP on localhost).

### 1c. Gotchas discovered standing this up (all fixed in-repo)

- **Nginx Unit serves nothing (HTTP 000/502).** The `web` image ships `certs/`+`scripts/` in `/var/lib/unit`, so Unit's entrypoint sees a non-empty statedir and _skips_ loading the app config → empty `listeners:{}`. Fix: `NGINX_UNIT_PRELOAD_CONFIG=true` (pre-bakes config into a fresh `--statedir`).
- **`/decide` is gone, `/flags` moved.** In `latest`, `/e`, `/flags`, `/decide` all resolve to the React catch-all (CSRF 403) on `web` — they're owned by `capture`/`feature-flags` now. That's why the Caddy routing (not the monolith) is load-bearing. Modern SDKs use `/flags?v=2`; `/decide` is not served.
- **feature-flags won't boot without a GeoIP DB.** It hard-requires `MAXMIND_DB_PATH`; `up.sh` extracts the `.mmdb` PostHog bundles in its own image into `./share` (gitignored, 65MB).
- **capture panics on a missing topic var.** Its v1 sink needs the _complete_ `CAPTURE_V1_SINK_MSK_KAFKA_TOPIC_*` set (incl. `EXCEPTION`, `HEATMAP`, `CLIENT_INGESTION_WARNING`) or it exits at boot.
- **Memory: the Docker VM is ~7.5 GB.** Full-fat `web` (4 Unit workers) + `worker` (default celery concurrency) OOM-kill each other. Capped to `NGINX_UNIT_APP_PROCESSES=2` and `WEB_CONCURRENCY=1` → steady state ~6 GB. The `migrate` one-shot also OOMs if you re-`up` while `worker` is already running; a cold `down && up` runs migrate _first_ (it gates web/worker) with room to spare — prefer that over re-`up`.
- **ClickHouse must be 26.6**; 24.x rejects `TTL on DateTime64` (Code 450) mid-migration. Migrate runs **Postgres then ClickHouse sequentially** (CH migrations read a Postgres table) with a `SYSTEM FLUSH LOGS` between them (one CH migration views `system.crash_log`, which only exists after a flush/crash).
- **bootstrap can't mint the personal key (CSRF-rotation 403).** Mint it via the Django shell instead (see §0 step 3).
- **provision insights need the query format.** Modern PostHog rejects legacy `filters` on `/insights/`; `provision.mjs` now sends an `InsightVizNode`/`FunnelsQuery`.

**Disk:** the full stack + ClickHouse data is several GB; `up.sh` refuses to start under 25 G free. `./down.sh` stops it; add `--volumes` to wipe data.

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

- **2026-08-13** — **Faithful local instance now runs** (supersedes the "no local instance" conclusion above).
  - Pinned ClickHouse to `26.6-alpine`; made `migrate` a sequential Postgres-then-ClickHouse one-shot with `SYSTEM FLUSH LOGS`; mounted PostHog's own CH `default.xml` (macros + clusters).
  - Discovered `latest` splits capture + flags out of the Django monolith. Added `capture` + `feature-flags` Rust services + a `caddy` front door on `:8000` (`Caddyfile`) so the app sees one origin. Documented what we omit (ingestion mesh, §1b) and why.
  - Fixed the Unit no-listener bug (`NGINX_UNIT_PRELOAD_CONFIG`), the GeoIP hard-requirement (`up.sh` extracts the `.mmdb`), the capture topic-var panic, and right-sized memory for the ~7.5 GB Docker VM (`NGINX_UNIT_APP_PROCESSES=2`, `WEB_CONCURRENCY=1`).
  - Fixed `provision.mjs` to create insights via the modern query format (legacy `filters` now rejected). Personal API key minted via Django shell (bootstrap's session-based mint hits a CSRF-rotation 403).
  - **Verified:** `smoke.mjs` green over `:8000` (localhost + LAN IP) — capture 200, 4 flags resolve `control`. Bound the app in `apps/mobile/.env.local` (`EXPO_PUBLIC_POSTHOG_KEY` + `EXPO_PUBLIC_POSTHOG_HOST`), everything else (Supabase/backend/RevenueCat) unchanged.
