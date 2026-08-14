#!/usr/bin/env node
/**
 * PostHog provisioning-as-code for Aura (2026-08-10).
 *
 * Creates every feature flag + the funnel dashboard the growth plan needs, via
 * the PostHog API. Idempotent (skips what already exists) and environment-driven,
 * so the SAME script provisions your local instance now and your real PostHog in
 * prod later — that is the whole point: no clicking, a reproducible record.
 *
 *   POSTHOG_HOST=http://localhost:8000 \
 *   POSTHOG_PROJECT_ID=1 \
 *   POSTHOG_PERSONAL_API_KEY=phx_xxx \
 *   node infra/posthog/provision.mjs
 *
 * Get POSTHOG_PERSONAL_API_KEY from: <host> → Settings → Personal API keys
 * (scopes: feature_flag:write, dashboard:write, insight:write). Or just run
 * `posthog-cli login` — the scripts fall back to that stored key automatically.
 * POSTHOG_PROJECT_ID is in the URL: <host>/project/<id>/…
 *
 * Flags are created ACTIVE but at 0% rollout (everyone → `control` = today's
 * shipped behaviour), so provisioning changes nothing until you ramp a variant.
 * See RUNBOOK.md for what each flag/experiment/event means and how to run one.
 */

import { resolveApiKey, resolveHost, resolveProjectId, usingCliKey } from './_cliAuth.mjs';

const HOST = resolveHost('http://localhost:8000');
const PROJECT_ID = resolveProjectId('1');
const API_KEY = resolveApiKey();

if (!API_KEY) {
  console.error('✗ No personal API key. Set POSTHOG_PERSONAL_API_KEY, or run `posthog-cli login`.');
  process.exit(1);
}
if (usingCliKey) console.log('→ Using the personal API key from `posthog-cli login`.');

const base = `${HOST}/api/projects/${PROJECT_ID}`;
const headers = {
  Authorization: `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

/**
 * Every flag keyed to the app's experiment registry
 * (apps/mobile/src/features/experiments/keys.ts). `control` is ALWAYS the shipped
 * behaviour; the second variant is the change under test.
 */
const FLAGS = [
  {
    key: 'onboarding-dream-home',
    name: 'Onboarding · dream-home question',
    variants: [
      ['control', 'shown (shipped)'],
      ['off', 'hidden — shorter conversation'],
    ],
  },
  {
    key: 'onboarding-commit-beat',
    name: 'Onboarding · commitment beat',
    variants: [
      ['control', 'shown (shipped)'],
      ['off', 'hidden'],
    ],
  },
  {
    key: 'home-first-run',
    name: 'Home · first-run welcome card',
    variants: [
      ['control', 'shown (shipped)'],
      ['off', 'hidden'],
    ],
  },
  {
    key: 'paywall-layout',
    name: 'Paywall · layout',
    variants: [
      ['control', 'single trial-timeline (shipped)'],
      ['steps', '3-step one-info-per-screen sequence'],
    ],
  },
];

/**
 * Funnel dashboards built from the app's typed events. Everyone sees `control`
 * at 0% rollout, so these read today's numbers until an experiment ramps.
 */
const DASHBOARD = {
  name: 'Aura · Growth funnels',
  insights: [
    {
      name: 'Acquisition funnel (install → paid)',
      events: [
        'onboarding_started',
        'onboarding_completed',
        'paywall_viewed',
        'trial_started',
        'purchase_completed',
      ],
    },
    {
      name: 'Onboarding funnel (start → commit → notifications)',
      events: [
        'onboarding_started',
        'commitment_accepted',
        'notification_permission_result',
        'onboarding_completed',
      ],
    },
    {
      name: 'First-run activation',
      events: ['firstrun_welcome_shown', 'firstrun_welcome_dismissed'],
    },
  ],
};

async function api(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function ensureFlag(flag) {
  const existing = await api('GET', `/feature_flags/?limit=400`);
  if (existing.results?.some((f) => f.key === flag.key)) {
    console.log(`  = flag ${flag.key} already exists — skipped`);
    return;
  }
  await api('POST', `/feature_flags/`, {
    key: flag.key,
    name: flag.name,
    active: true,
    filters: {
      // 0% for every non-control variant → everyone lands on control until you ramp.
      groups: [{ properties: [], rollout_percentage: 100, variant: null }],
      multivariate: {
        variants: flag.variants.map(([key, name], i) => ({
          key,
          name,
          rollout_percentage: i === 0 ? 100 : 0,
        })),
      },
    },
  });
  console.log(`  + flag ${flag.key} created (100% control)`);
}

async function ensureDashboard(spec) {
  const dashboards = await api('GET', `/dashboards/?limit=400`);
  let board = dashboards.results?.find((d) => d.name === spec.name);
  if (!board) {
    board = await api('POST', `/dashboards/`, { name: spec.name });
    console.log(`  + dashboard "${spec.name}" created (id ${board.id})`);
  } else {
    console.log(`  = dashboard "${spec.name}" exists (id ${board.id}) — adding missing insights`);
  }

  const existing = await api('GET', `/insights/?limit=400`);
  for (const insight of spec.insights) {
    if (existing.results?.some((i) => i.name === insight.name)) {
      console.log(`    = insight "${insight.name}" already exists — skipped`);
      continue;
    }
    await api('POST', `/insights/`, {
      name: insight.name,
      dashboards: [board.id],
      // Modern PostHog rejects legacy `filters` on insights ("Creating or
      // updating insights with legacy filters is not available for this user").
      // Insights are now query-based: an InsightVizNode wrapping a FunnelsQuery,
      // one EventsNode per funnel step.
      query: {
        kind: 'InsightVizNode',
        source: {
          kind: 'FunnelsQuery',
          series: insight.events.map((id) => ({ kind: 'EventsNode', event: id, name: id })),
          funnelsFilter: { funnelVizType: 'steps' },
          dateRange: { date_from: '-30d' },
        },
      },
    });
    console.log(`    + insight "${insight.name}" created`);
  }
}

async function main() {
  console.log(`→ Provisioning PostHog at ${HOST} (project ${PROJECT_ID})\n`);
  console.log('Feature flags:');
  for (const flag of FLAGS) await ensureFlag(flag);
  console.log('\nDashboards:');
  await ensureDashboard(DASHBOARD);
  console.log('\n✓ Done. Flags are at 100% control (no behaviour change until you ramp a variant).');
  console.log('  Next: open an experiment in the PostHog UI on a flag, or ramp a variant %.');
}

main().catch((err) => {
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
});
