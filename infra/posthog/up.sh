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
MMDB=share/GeoLite2-City.mmdb
if [ ! -f "$MMDB" ]; then
  echo "→ Extracting GeoIP DB for the feature-flags service (one-time)…"
  mkdir -p share
  cid=$(docker create posthog/posthog:latest)
  docker cp "$cid:/code/share/GeoLite2-City.mmdb" "$MMDB"
  docker rm "$cid" >/dev/null
fi

echo "→ ${avail_gb}G free — starting PostHog (first boot pulls images + runs migrations, 2–5 min)."
docker compose up -d
echo "Open http://localhost:8000 once healthy.  Watch: docker compose -p aura-posthog logs -f web"
