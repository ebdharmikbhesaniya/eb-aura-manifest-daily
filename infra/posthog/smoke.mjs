#!/usr/bin/env node
/**
 * PostHog smoke test (2026-08-10) — validates the exact integration the app uses.
 *
 * The React-Native app can't run in this sandbox (no simulator), so this script
 * exercises the same two HTTP paths posthog-react-native uses, with the same
 * project ingestion key the app would use:
 *   1. capture  — POST /i/v0/e/         (an event lands in PostHog)
 *   2. flags    — POST /flags?v=2 / /decide  (feature flags resolve for a user)
 *
 * If both succeed, the app's analytics + feature-flag wiring is proven against
 * this instance. Point it at local now; the same paths work in prod.
 *
 *   POSTHOG_HOST=http://localhost:8000 POSTHOG_PROJECT_API_KEY=phc_xxx \
 *   node infra/posthog/smoke.mjs
 */

const HOST = (process.env.POSTHOG_HOST || 'http://localhost:8000').replace(/\/$/, '');
const KEY = process.env.POSTHOG_PROJECT_API_KEY;

if (!KEY) {
  console.error('✗ POSTHOG_PROJECT_API_KEY (phc_…) required — the project ingestion key.');
  process.exit(1);
}

const distinctId = `smoke-${Date.now()}`;

async function capture() {
  const res = await fetch(`${HOST}/i/v0/e/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: KEY,
      event: 'onboarding_completed', // a real catalog event
      distinct_id: distinctId,
      properties: { duration_s: 42, questions_answered: 6, $lib: 'aura-smoke' },
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`capture → ${res.status}: ${text.slice(0, 200)}`);
  console.log(`  ✓ capture accepted (${res.status}) — event "onboarding_completed" sent`);
}

async function flags() {
  // The modern endpoint is /flags?v=2; older instances use /decide?v=3. Try both.
  for (const path of ['/flags?v=2', '/decide?v=3']) {
    const res = await fetch(`${HOST}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: KEY, distinct_id: distinctId }),
    });
    if (res.ok) {
      const json = await res.json();
      const flagKeys = Object.keys(json.featureFlags || json.flags || {});
      console.log(
        `  ✓ flags resolved via ${path} — ${flagKeys.length} flag(s): ${flagKeys.join(', ') || '(none yet)'}`,
      );
      return;
    }
  }
  throw new Error('flags: neither /flags?v=2 nor /decide?v=3 responded OK');
}

async function main() {
  console.log(`→ Smoke-testing PostHog at ${HOST}\n`);
  await capture();
  await flags();
  console.log('\n✓ Integration path OK — the app can capture events and read flags here.');
}

main().catch((err) => {
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
});
