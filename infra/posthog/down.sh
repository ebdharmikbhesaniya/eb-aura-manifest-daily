#!/usr/bin/env bash
# Stop local PostHog. Pass --volumes to also wipe all data (fresh start).
set -euo pipefail
cd "$(dirname "$0")"
docker compose down "$@"
