#!/usr/bin/env node
/**
 * PostHog dashboards-as-code for Aura (2026-08-14).
 *
 * Creates six perspective dashboards — one per lens the team monitors — via the
 * PostHog API, built ONLY from events the app actually emits (verified against
 * packages/shared/src/events/types.ts). Idempotent (skips insights/dashboards
 * that already exist by name) and environment-driven, so the SAME script runs
 * against your local instance and your real PostHog Cloud project.
 *
 *   POSTHOG_HOST=https://us.i.posthog.com \
 *   POSTHOG_PROJECT_ID=<id> \
 *   POSTHOG_PERSONAL_API_KEY=phx_xxx \
 *   node infra/posthog/dashboards.mjs
 *
 * Get POSTHOG_PERSONAL_API_KEY from: <host> → Settings → Personal API keys
 *   (scopes needed: dashboard:write, insight:write). Or just run `posthog-cli
 *   login` — this script falls back to that stored key automatically.
 * POSTHOG_PROJECT_ID is in the URL: <host>/project/<id>/…
 *
 * Run `provision.mjs` FIRST — it creates the feature flags the Experiments
 * dashboard breaks down by. This script only builds dashboards + insights.
 *
 * Two dashboards are SCAFFOLDS that stay empty until code lands (each insight
 * says so in its description):
 *   • Experiments (A/B) — needs `useVariant()` consumed in a screen so PostHog
 *     sets `$feature/<flag>` on events and emits `$feature_flag_called`.
 *   • the `$exception` tile — needs PostHog exception autocapture enabled in the
 *     SDK (off today by privacy design). The rest of Error Tracking uses real
 *     app error events and populates immediately.
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
const headers = { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' };

const DAYS = '-30d';

// ── Insight query builders (all query-based InsightVizNode; legacy filters are
//    rejected by modern PostHog). Each returns a `query` object. ──────────────

/** EventsNode with optional math. */
const ev = (event, math, mathProperty) => ({
  kind: 'EventsNode',
  event,
  name: event,
  ...(math ? { math } : {}),
  ...(mathProperty ? { math_property: mathProperty } : {}),
});

/** Funnel over an ordered list of event names. Optional variant breakdown. */
const funnel = (events, { breakdown, date_from = DAYS } = {}) => ({
  kind: 'InsightVizNode',
  source: {
    kind: 'FunnelsQuery',
    series: events.map((e) => ev(e)),
    funnelsFilter: { funnelVizType: 'steps' },
    ...(breakdown ? { breakdownFilter: { breakdown_type: 'event', breakdown } } : {}),
    dateRange: { date_from },
  },
});

/** Trend over one or more EventsNode series. Optional breakdown/formula/interval. */
const trend = (series, { breakdown, formula, interval = 'day', display = 'ActionsLineGraph', date_from = DAYS } = {}) => ({
  kind: 'InsightVizNode',
  source: {
    kind: 'TrendsQuery',
    series,
    interval,
    trendsFilter: { display, ...(formula ? { formula } : {}) },
    ...(breakdown ? { breakdownFilter: { breakdown_type: 'event', breakdown } } : {}),
    dateRange: { date_from },
  },
});

/** First-time retention: did users who did `target` come back and do `returning`? */
const retention = (target, returning, { period = 'Week', totalIntervals = 8, date_from = '-56d' } = {}) => ({
  kind: 'InsightVizNode',
  source: {
    kind: 'RetentionQuery',
    retentionFilter: {
      targetEntity: { id: target, name: target, type: 'events' },
      returningEntity: { id: returning, name: returning, type: 'events' },
      period,
      totalIntervals,
      retentionType: 'retention_first_time',
    },
    dateRange: { date_from },
  },
});

/** Lifecycle: new / returning / resurrecting / dormant users around one event. */
const lifecycle = (event, { interval = 'week', date_from = '-30d' } = {}) => ({
  kind: 'InsightVizNode',
  source: {
    kind: 'LifecycleQuery',
    series: [ev(event, 'total')],
    interval,
    dateRange: { date_from },
  },
});

// ── The six dashboards ───────────────────────────────────────────────────────

const DASHBOARDS = [
  {
    name: 'Aura · 1 Acquisition & Activation',
    description: 'The install → wow → paid journey. The core growth funnels.',
    insights: [
      { name: 'A&A · First-session funnel (open → wow → paywall)',
        query: funnel(['app_first_open', 'onboarding_started', 'onboarding_completed', 'letter_generation_started', 'letter_playback_started', 'letter_playback_completed', 'paywall_viewed', 'trial_started']) },
      { name: 'A&A · Acquisition funnel (onboarding → paid)',
        query: funnel(['onboarding_started', 'onboarding_completed', 'paywall_viewed', 'trial_started', 'purchase_completed']) },
      { name: 'A&A · Onboarding step funnel',
        query: funnel(['onboarding_started', 'onboarding_screen_viewed', 'onboarding_answer_submitted', 'commitment_accepted', 'onboarding_completed']) },
      { name: 'A&A · First-run welcome activation',
        query: funnel(['firstrun_welcome_shown', 'firstrun_welcome_dismissed']) },
      { name: 'A&A · New users per day (app_first_open)',
        query: trend([ev('app_first_open', 'total')]) },
      { name: 'A&A · Onboarding completions per day',
        query: trend([ev('onboarding_completed', 'total')]) },
    ],
  },

  {
    name: 'Aura · 2 Engagement & Retention',
    description: 'Who comes back, how sticky the ritual is, and what active users do.',
    insights: [
      { name: 'E&R · DAU (app_open)', query: trend([ev('app_open', 'dau')]) },
      { name: 'E&R · WAU (app_open)', query: trend([ev('app_open', 'weekly_active')]) },
      { name: 'E&R · Weekly retention (first open → return)',
        query: retention('app_first_open', 'app_open') },
      { name: 'E&R · Lifecycle (new / returning / resurrecting / dormant)',
        query: lifecycle('app_open') },
      { name: 'E&R · Ritual completions per day', query: trend([ev('ritual_completed', 'total')]) },
      { name: 'E&R · Daily active actions (moment / gratitude / affirmation)',
        query: trend([ev('moment_playback_completed', 'total'), ev('gratitude_entry_saved', 'total'), ev('affirmation_revealed', 'total')]) },
      { name: 'E&R · Notification open-rate % (opened ÷ sent)',
        query: trend([ev('moment_arrival_notification_opened', 'total'), ev('moment_arrival_notification_sent', 'total')], { formula: 'A / B * 100' }),
        description: 'Target >60% per spec 13 §6. A=opened, B=sent.' },
      { name: 'E&R · Memory items created by category',
        query: trend([ev('memory_item_created', 'total')], { breakdown: 'category' }) },
    ],
  },

  {
    name: 'Aura · 3 Experiments (A/B)',
    description: 'SCAFFOLD — populates once useVariant() is consumed in a screen so PostHog sets $feature/<flag> on events. Ramp variants in provision.mjs / the Experiments UI.',
    insights: [
      { name: 'A/B · Exposure — $feature_flag_called by flag',
        query: trend([ev('$feature_flag_called', 'total')], { breakdown: '$feature_flag' }),
        description: 'Empty until a screen reads a flag via useVariant().' },
      { name: 'A/B · paywall-layout — paywall → trial by variant',
        query: funnel(['paywall_viewed', 'trial_started'], { breakdown: '$feature/paywall-layout' }),
        description: 'control (trial-timeline) vs steps (3-step). Empty until wired.' },
      { name: 'A/B · paywall-layout — purchases by variant',
        query: trend([ev('purchase_completed', 'total')], { breakdown: '$feature/paywall-layout' }) },
      { name: 'A/B · onboarding-dream-home — completion by variant',
        query: funnel(['onboarding_started', 'onboarding_completed'], { breakdown: '$feature/onboarding-dream-home' }) },
      { name: 'A/B · onboarding-commit-beat — completion by variant',
        query: funnel(['onboarding_started', 'onboarding_completed'], { breakdown: '$feature/onboarding-commit-beat' }) },
      { name: 'A/B · home-first-run — trial by variant',
        query: funnel(['app_open', 'paywall_viewed', 'trial_started'], { breakdown: '$feature/home-first-run' }) },
    ],
  },

  {
    name: 'Aura · 4 Monetization',
    description: 'Paywall performance, trial→paid conversion, and subscription churn.',
    insights: [
      { name: 'Rev · Paywall funnel (view → plan → trial → paid)',
        query: funnel(['paywall_viewed', 'paywall_plan_selected', 'trial_started', 'purchase_completed']) },
      { name: 'Rev · Trial → paid conversion',
        query: funnel(['trial_started', 'purchase_completed'], { date_from: '-90d' }) },
      { name: 'Rev · Trials started per day', query: trend([ev('trial_started', 'total')]) },
      { name: 'Rev · Purchases per day', query: trend([ev('purchase_completed', 'total')]) },
      { name: 'Rev · Paywall views by surface',
        query: trend([ev('paywall_viewed', 'total')], { breakdown: 'surface' }) },
      { name: 'Rev · Locked-feature touches by feature',
        query: trend([ev('locked_feature_touched', 'total')], { breakdown: 'feature' }) },
      { name: 'Rev · Renewals vs cancellations',
        query: trend([ev('subscription_renewed', 'total'), ev('subscription_cancelled', 'total')]) },
    ],
  },

  {
    name: 'Aura · 5 Reliability & Monitoring',
    description: 'Generation health, QA-flag rate (alarm >5%), and playback latency.',
    insights: [
      { name: 'Ops · Generation failures by reason',
        query: trend([ev('generation_failed', 'total')], { breakdown: 'reason' }) },
      { name: 'Ops · Generation failures by surface',
        query: trend([ev('generation_failed', 'total')], { breakdown: 'surface' }) },
      { name: 'Ops · QA flags by rule',
        query: trend([ev('generation_qa_flagged', 'total')], { breakdown: 'rule' }) },
      { name: 'Ops · Letter generation — success vs fail',
        query: trend([ev('letter_generation_succeeded', 'total'), ev('letter_generation_failed', 'total')]) },
      { name: 'Ops · QA-flag rate % (alarm >5%)',
        query: trend([ev('generation_qa_flagged', 'total'), ev('letter_generation_started', 'total')], { formula: 'A / B * 100' }),
        description: 'Alarm threshold >5% (spec 13 §6.5). A=qa_flagged, B=generation_started.' },
      { name: 'Ops · Audio start latency p75 / p90 (ms)',
        query: trend([ev('audio_start_latency_ms', 'p75', 'latency_ms'), ev('audio_start_latency_ms', 'p90', 'latency_ms')]) },
      { name: 'Ops · Playback errors by reason',
        query: trend([ev('playback_error', 'total')], { breakdown: 'reason' }) },
    ],
  },

  {
    name: 'Aura · 6 Error Tracking',
    description: 'App-level error events (populated). $exception tile needs PostHog exception autocapture enabled in the SDK (off today by privacy design).',
    insights: [
      { name: 'Err · Total app errors per day',
        query: trend([ev('generation_failed', 'total'), ev('letter_generation_failed', 'total'), ev('playback_error', 'total')]) },
      { name: 'Err · Generation failures by reason',
        query: trend([ev('generation_failed', 'total')], { breakdown: 'reason' }) },
      { name: 'Err · Letter generation failures by reason',
        query: trend([ev('letter_generation_failed', 'total')], { breakdown: 'reason' }) },
      { name: 'Err · Playback errors by reason',
        query: trend([ev('playback_error', 'total')], { breakdown: 'reason' }) },
      { name: 'Err · Exceptions ($exception) — needs autocapture',
        query: trend([ev('$exception', 'total')]),
        description: 'Empty until PostHog exception autocapture is enabled in analytics.ts. See RUNBOOK.' },
    ],
  },
];

// ── Runner ───────────────────────────────────────────────────────────────────

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

async function ensureDashboard(spec, existingInsightNames) {
  const dashboards = await api('GET', `/dashboards/?limit=400`);
  let board = dashboards.results?.find((d) => d.name === spec.name);
  if (!board) {
    board = await api('POST', `/dashboards/`, { name: spec.name, description: spec.description || '' });
    console.log(`\n+ dashboard "${spec.name}" (id ${board.id})`);
  } else {
    console.log(`\n= dashboard "${spec.name}" exists (id ${board.id}) — adding missing insights`);
  }

  let created = 0, skipped = 0, failed = 0;
  for (const insight of spec.insights) {
    if (existingInsightNames.has(insight.name)) {
      skipped++;
      continue;
    }
    try {
      await api('POST', `/insights/`, {
        name: insight.name,
        description: insight.description || '',
        dashboards: [board.id],
        query: insight.query,
      });
      existingInsightNames.add(insight.name);
      created++;
      console.log(`    + ${insight.name}`);
    } catch (err) {
      failed++;
      console.log(`    ✗ ${insight.name}\n        ${err.message}`);
    }
  }
  console.log(`  → ${created} created, ${skipped} existed, ${failed} failed`);
  return { created, skipped, failed };
}

async function main() {
  console.log(`→ Provisioning dashboards at ${HOST} (project ${PROJECT_ID})`);
  const existing = await api('GET', `/insights/?limit=400`);
  const existingInsightNames = new Set((existing.results || []).map((i) => i.name).filter(Boolean));

  let totals = { created: 0, skipped: 0, failed: 0 };
  for (const spec of DASHBOARDS) {
    const r = await ensureDashboard(spec, existingInsightNames);
    totals.created += r.created;
    totals.skipped += r.skipped;
    totals.failed += r.failed;
  }

  console.log(`\n✓ Done. ${DASHBOARDS.length} dashboards · ${totals.created} insights created, ${totals.skipped} already existed, ${totals.failed} failed.`);
  if (totals.failed) console.log('  (Failures are usually a query-schema quirk on one tile — the rest are fine. Share the ✗ line if you want it fixed.)');
  console.log(`  Open: ${HOST}/project/${PROJECT_ID}/dashboard`);
}

main().catch((err) => {
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
});
