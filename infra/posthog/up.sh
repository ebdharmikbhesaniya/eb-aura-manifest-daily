#!/usr/bin/env bash
# Bring up local PostHog. Guards against the disk-fill incident of 2026-08-10:
# PostHog's stack pulls ~10–15GB of images; on a near-full disk the pull can
# fill the disk and stop OTHER containers (it stopped local Supabase). Refuses
# to start unless there is real headroom.
set -euo pipefail
cd "$(dirname "$0")"

MIN_GB=25
avail_gb=$(df -BG --output=avail / | tail -1 | tr -dc '0-9')
if [ "${avail_gb:-0}" -lt "$MIN_GB" ]; then
  echo "✗ Only ${avail_gb}G free on / — PostHog needs ~${MIN_GB}G headroom for its image pull."
  echo "  Free space first (e.g. 'docker system prune -a' removes UNUSED images — review it),"
  echo "  or use PostHog Cloud instead (see RUNBOOK.md §1 — same code + provisioning)."
  exit 1
fi

# The feature-flags service hard-requires a MaxMind GeoIP DB and refuses to boot
# without it. PostHog bundles one inside its own image; extract it into ./share
# (gitignored, 65MB) if missing so a fresh clone comes up clean.
# Two assets the app-facing services need are shipped inside the posthog image but
# aren't in this repo (too large / version-specific). Extract whatever is missing
# in one throwaway container:
#   - share/GeoLite2-City.mmdb    → the feature-flags service refuses to boot without it
#   - clickhouse/user_scripts/    → the aggregate_funnel UDF binaries funnel insights call
MMDB=share/GeoLite2-City.mmdb
USER_SCRIPTS=clickhouse/user_scripts
if [ ! -f "$MMDB" ] || [ ! -d "$USER_SCRIPTS" ]; then
  echo "→ Extracting bundled assets from the posthog image (one-time)…"
  cid=$(docker create posthog/posthog:latest)
  if [ ! -f "$MMDB" ]; then
    mkdir -p share
    docker cp "$cid:/code/share/GeoLite2-City.mmdb" "$MMDB"
  fi
  if [ ! -d "$USER_SCRIPTS" ]; then
    docker cp "$cid:/code/posthog/user_scripts" "$USER_SCRIPTS"
  fi
  docker rm "$cid" >/dev/null
fi

echo "→ ${avail_gb}G free — starting PostHog (first boot pulls images + runs migrations, 2–5 min)."
docker compose up -d
echo "Open http://localhost:8000 once healthy.  Watch: docker compose -p aura-posthog logs -f web"
