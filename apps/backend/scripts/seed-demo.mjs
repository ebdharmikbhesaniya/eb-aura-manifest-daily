/**
 * Seed EVERY tab with the "fully furnished" v4 mock content for ONE user, so the
 * app renders like `Aura Design v4.dc.html` instead of a fresh-account blank.
 * Dev-only convenience — never run against production.
 *
 * Covers: Home (moments), Affirmations, Gratitude, Profile (people + fields),
 * What Aura Knows (memory_items) and Never include (never_include).
 *
 * Usage (from apps/backend):
 *   node scripts/seed-demo.mjs "Jemy"          # seed by profile name
 *   node scripts/seed-demo.mjs --user <uuid>   # seed by user id
 *   node scripts/seed-demo.mjs "Jemy" --clean  # remove previously seeded rows
 *
 * Additive tables are tagged so --clean removes exactly what this added:
 *   moments.desire_text / affirmations.goal_area / gratitude.prompt_shown = SEED_TAG,
 *   memory_items.source_id = SEED_UUID, never_include/people by seeded values.
 * Profile text fields are filled ONLY when empty (never overwriting real
 * onboarding answers) and are left untouched by --clean.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

const here = dirname(fileURLToPath(import.meta.url));
const SEED_TAG = 'seed:home-demo';
/** Fixed marker for memory_items.source_id ("5eed" = seed). */
const SEED_UUID = '00000000-0000-4000-8000-0000005eed00';

function loadEnv() {
  const raw = readFileSync(join(here, '..', '.env'), 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m && !line.trimStart().startsWith('#')) env[m[1]] = m[2];
  }
  return env;
}

const env = loadEnv();
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in apps/backend/.env');
  process.exit(1);
}

const args = process.argv.slice(2);
const clean = args.includes('--clean');
const userFlagIdx = args.indexOf('--user');
const userIdArg = userFlagIdx >= 0 ? args[userFlagIdx + 1] : null;
const nameArg = args.find((a) => !a.startsWith('--') && a !== userIdArg) ?? null;

const db = createClient(url, key, { auth: { persistSession: false } });

async function resolveUserId() {
  if (userIdArg) return userIdArg;
  if (!nameArg) {
    console.error('Pass a profile name (e.g. "Jemy") or --user <uuid>.');
    process.exit(1);
  }
  const { data, error } = await db
    .from('profiles')
    .select('user_id, name')
    .ilike('name', nameArg)
    .limit(2);
  if (error) throw error;
  if (!data || data.length === 0) {
    console.error(`No profile found with name "${nameArg}".`);
    process.exit(1);
  }
  if (data.length > 1) {
    console.error(`More than one profile named "${nameArg}" — pass --user <uuid> instead.`);
    process.exit(1);
  }
  return data[0].user_id;
}

const now = Date.now();
const HOUR = 3_600_000;
const DAY = 86_400_000;
const iso = (msAgo) => new Date(now - msAgo).toISOString();
const dayISO = (daysFromNow) => new Date(now + daysFromNow * DAY).toISOString().slice(0, 10);

// ── Seed content, mapped onto real rows ─────────────────────────────────────

const NEVER_TERMS = ['dieting', 'an ex-partner'];
const PEOPLE = [
  { name: 'Mom', descriptor: 'safe' },
  { name: 'Jane', descriptor: 'fun' },
];
const PROFILE_FIELDS = {
  self_description: 'Restless in a good way. I start things before I feel ready.',
  dream_city: 'Lisbon',
  dream_home: 'beach house',
  free_text_note: 'I want my mornings to feel unhurried.',
};

function momentRows(userId) {
  const base = { user_id: userId, status: 'ready', desire_text: SEED_TAG };
  return [
    { ...base, type: 'daily', title: 'A morning in Lisbon', body: 'Slow light through tall windows. You are exactly where you meant to be.', duration_ms: 120_000, scheduled_for: dayISO(0), created_at: iso(2 * HOUR) },
    { user_id: userId, status: 'forming', type: 'daily', title: 'Tomorrow — about the studio', scheduled_for: dayISO(1), desire_text: SEED_TAG, created_at: iso(HOUR) },
    { user_id: userId, status: 'forming', type: 'milestone', milestone_day: 7, title: 'Day 7 — a letter is forming', scheduled_for: dayISO(6), desire_text: SEED_TAG, created_at: iso(HOUR) },
    { ...base, type: 'daily', title: 'Before the interview', body: 'You walked in already calm. The room felt like yours.', duration_ms: 90_000, played_at: iso(3 * HOUR), favorited_at: iso(3 * HOUR), created_at: iso(DAY) },
    { ...base, type: 'milestone', milestone_day: 1, title: 'Your letter', body: 'The first one. Kept forever.', duration_ms: 190_000, played_at: iso(DAY), favorited_at: iso(DAY), created_at: iso(2 * DAY) },
    { ...base, type: 'ondemand', title: 'A calm night', body: 'Everything you needed was already handled.', duration_ms: 110_000, played_at: iso(3 * DAY), created_at: iso(3 * DAY) },
    { ...base, type: 'ondemand', title: 'The morning it feels easy', body: 'No rush. The day arranged itself around you.', duration_ms: 130_000, played_at: iso(5 * DAY), created_at: iso(5 * DAY) },
  ];
}

function affirmationRows(userId) {
  const tag = { user_id: userId, goal_area: SEED_TAG };
  const kept = (text, agoDays) => ({ ...tag, kind: 'guided', status: 'kept', technique: 'identity', text, saved_at: iso(agoDays * DAY), created_at: iso(agoDays * DAY) });
  return [
    // Today's daily card (reveal ceremony is client-side; status stays candidate).
    { ...tag, kind: 'daily', status: 'candidate', technique: 'identity', text: 'I am building the studio with my own hands, one quiet morning at a time.', why_line: 'Because you said the studio is where the real life begins.', created_at: iso(HOUR) },
    kept('I don’t rush what’s already on its way to me.', 1),
    kept('I start things before I feel ready — that is my way.', 2),
    kept('The quiet mornings are mine, and I protect them.', 4),
    kept('What I am building is worth the unglamorous parts.', 6),
  ];
}

function gratitudeRows(userId) {
  const entry = (text, agoDays) => ({ user_id: userId, entry: text, entry_date: dayISO(-agoDays), prompt_shown: SEED_TAG, prompt_was_personalized: false, synced_from_local: true });
  return [
    entry('coffee on the balcony before anyone woke up', 1),
    entry('Jane laughed so hard she cried. I made that happen', 2),
    entry('sent the portfolio. didn’t wait to feel ready', 3),
    entry('a long walk with no phone', 6),
    entry('the flat felt like home for the first time', 9),
  ];
}

function memoryRows(userId) {
  const m = (category, tier, content, source = 'onboarding') => ({ user_id: userId, category, tier, content, source, source_id: SEED_UUID });
  return [
    m('identity', 'permanent', 'You described yourself as: Restless in a good way'),
    m('dream', 'permanent', 'Your dream city is Lisbon'),
    m('dream', 'permanent', 'A small flat in Lisbon with tall windows'),
    m('person', 'permanent', 'Jane makes you laugh until you cry'),
    m('struggle', 'sensitive', 'Waiting on the visa — it feels like real life is on hold'),
    m('gratitude_ref', 'evolving', 'Balcony coffee before the house wakes', 'gratitude'),
  ];
}

// ── Clean + seed ────────────────────────────────────────────────────────────

async function clear(userId) {
  const results = await Promise.all([
    db.from('moments').delete({ count: 'exact' }).eq('user_id', userId).eq('desire_text', SEED_TAG),
    db.from('affirmations').delete({ count: 'exact' }).eq('user_id', userId).eq('goal_area', SEED_TAG),
    db.from('gratitude_entries').delete({ count: 'exact' }).eq('user_id', userId).eq('prompt_shown', SEED_TAG),
    db.from('memory_items').delete({ count: 'exact' }).eq('user_id', userId).eq('source_id', SEED_UUID),
    db.from('never_include').delete({ count: 'exact' }).eq('user_id', userId).in('term', NEVER_TERMS),
    db.from('people').delete({ count: 'exact' }).eq('user_id', userId).in('name', PEOPLE.map((p) => p.name)),
  ]);
  for (const r of results) if (r.error) throw r.error;
  const total = results.reduce((n, r) => n + (r.count ?? 0), 0);
  console.log(`Removed ${total} previously seeded row(s).`);
}

async function fillProfileIfEmpty(userId) {
  const { data, error } = await db.from('profiles').select('*').eq('user_id', userId).single();
  if (error) throw error;
  const patch = {};
  for (const [k, v] of Object.entries(PROFILE_FIELDS)) {
    const current = data[k];
    if (current === null || current === undefined || String(current).trim() === '') patch[k] = v;
  }
  if (Object.keys(patch).length === 0) {
    console.log('Profile fields already set — left as-is.');
    return;
  }
  const { error: upErr } = await db.from('profiles').update(patch).eq('user_id', userId);
  if (upErr) throw upErr;
  console.log(`Filled empty profile fields: ${Object.keys(patch).join(', ')}.`);
}

async function insertMany(table, rows) {
  const { data, error } = await db.from(table).insert(rows).select('id');
  if (error) throw error;
  console.log(`  ${table}: ${data?.length ?? 0}`);
}

/**
 * Gratitude is the one table the user writes directly, and (user_id, entry_date)
 * is unique — so only seed dates she has NOT already written, never overwriting
 * a real entry.
 */
async function seedGratitude(userId) {
  const rows = gratitudeRows(userId);
  const { data, error } = await db
    .from('gratitude_entries')
    .select('entry_date')
    .eq('user_id', userId)
    .in(
      'entry_date',
      rows.map((r) => r.entry_date),
    );
  if (error) throw error;
  const taken = new Set((data ?? []).map((r) => r.entry_date));
  const fresh = rows.filter((r) => !taken.has(r.entry_date));
  if (fresh.length === 0) {
    console.log('  gratitude_entries: 0 (all dates already have entries)');
    return;
  }
  const { data: inserted, error: insErr } = await db
    .from('gratitude_entries')
    .insert(fresh)
    .select('id');
  if (insErr) throw insErr;
  console.log(`  gratitude_entries: ${inserted?.length ?? 0}`);
}

async function main() {
  const userId = await resolveUserId();
  console.log(`Target user: ${userId}`);

  await clear(userId);
  if (clean) {
    console.log('Clean-only run — done.');
    return;
  }

  console.log('Seeding:');
  await insertMany('moments', momentRows(userId));
  await insertMany('affirmations', affirmationRows(userId));
  await seedGratitude(userId);
  await insertMany('memory_items', memoryRows(userId));
  await insertMany(
    'never_include',
    NEVER_TERMS.map((term) => ({ user_id: userId, term })),
  );
  await insertMany(
    'people',
    PEOPLE.map((p) => ({ user_id: userId, name: p.name, descriptor: p.descriptor, active: true })),
  );
  await fillProfileIfEmpty(userId);

  console.log('\nDone. Every tab now furnishes like Aura Design v4:');
  console.log('  Home         — today’s moment, coming-for-you, collections, recently played');
  console.log('  Affirmations — today’s card + 4 saved');
  console.log('  Gratitude    — 5 entries (week dots + history)');
  console.log('  Profile      — people, dream, note; What Aura Knows (6), Never include (2)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
