#!/usr/bin/env bash
# Bring up local PostHog. First run pulls several GB and runs migrations —
# the web UI can take 2–5 min to become healthy. Then open http://localhost:8000.
set -euo pipefail
cd "$(dirname "$0")"
docker compose up -d
echo "PostHog starting → http://localhost:8000 (first boot: wait for migrations)."
echo "Watch:  docker compose -p aura-posthog logs -f web"
