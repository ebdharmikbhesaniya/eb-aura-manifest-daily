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

echo "→ ${avail_gb}G free — starting PostHog (first boot pulls images + runs migrations, 2–5 min)."
docker compose up -d
echo "Open http://localhost:8000 once healthy.  Watch: docker compose -p aura-posthog logs -f web"
