/**
 * Seed the Home screen with the "fully furnished" v4 mock content for ONE user,
 * so the app renders like `Aura Design v4.dc.html` instead of a fresh-account
 * blank. Dev-only convenience — never run against production.
 *
 * Usage (from apps/backend):
 *   node scripts/seed-home-demo.mjs "Jemy"          # seed by profile name
 *   node scripts/seed-home-demo.mjs --user <uuid>   # seed by user id
 *   node scripts/seed-home-demo.mjs "Jemy" --clean  # remove previously seeded rows
 *
 * Every row it writes is tagged with desire_text = SEED_TAG, so --clean removes
 * exactly what it added and nothing a real user created.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

const here = dirname(fileURLToPath(import.meta.url));
const SEED_TAG = 'seed:home-demo';

/** Read SUPABASE_URL / SERVICE_ROLE_KEY from apps/backend/.env without extra deps. */
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

/** Resolve the target user id from --user <uuid> or a profile name. */
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
const iso = (msAgo) => new Date(now - msAgo).toISOString();
const dayISO = (daysFromNow) =>
  new Date(now + daysFromNow * 86_400_000).toISOString().slice(0, 10);

const HOUR = 3_600_000;
const DAY = 86_400_000;

/**
 * The mock's content, mapped onto real `moments` rows. Titles are QA-safe (no
 * sensitive text), which is what the Home surfaces read.
 */
function rows(userId) {
  const base = { user_id: userId, status: 'ready', desire_text: SEED_TAG };
  return [
    // TODAY'S MOMENT — the newest ready daily, not yet played.
    {
      ...base,
      type: 'daily',
      title: 'A morning in Lisbon',
      body: 'Slow light through tall windows. You are exactly where you meant to be.',
      duration_ms: 120_000,
      scheduled_for: dayISO(0),
      created_at: iso(2 * HOUR),
    },
    // COMING FOR YOU — forming, with titles + scheduled dates.
    {
      user_id: userId,
      status: 'forming',
      type: 'daily',
      title: 'Tomorrow — about the studio',
      scheduled_for: dayISO(1),
      desire_text: SEED_TAG,
      created_at: iso(1 * HOUR),
    },
    {
      user_id: userId,
      status: 'forming',
      type: 'milestone',
      milestone_day: 7,
      title: 'Day 7 — a letter is forming',
      scheduled_for: dayISO(6),
      desire_text: SEED_TAG,
      created_at: iso(1 * HOUR),
    },
    // RECENTLY PLAYED + FAVORITES (played + favorited counts toward Favorites).
    {
      ...base,
      type: 'daily',
      title: 'Before the interview',
      body: 'You walked in already calm. The room felt like yours.',
      duration_ms: 90_000,
      played_at: iso(3 * HOUR),
      favorited_at: iso(3 * HOUR),
      created_at: iso(1 * DAY),
    },
    {
      ...base,
      type: 'milestone',
      milestone_day: 1,
      title: 'Your letter',
      body: 'The first one. Kept forever.',
      duration_ms: 190_000,
      played_at: iso(1 * DAY),
      favorited_at: iso(1 * DAY),
      created_at: iso(2 * DAY),
    },
    // ON DEMAND (played, type ondemand → counts toward On demand).
    {
      ...base,
      type: 'ondemand',
      title: 'A calm night',
      body: 'Everything you needed was already handled.',
      duration_ms: 110_000,
      played_at: iso(3 * DAY),
      created_at: iso(3 * DAY),
    },
    {
      ...base,
      type: 'ondemand',
      title: 'The morning it feels easy',
      body: 'No rush. The day arranged itself around you.',
      duration_ms: 130_000,
      played_at: iso(5 * DAY),
      created_at: iso(5 * DAY),
    },
  ];
}

async function main() {
  const userId = await resolveUserId();

  // Always clear prior seed rows first — keeps re-runs idempotent and gives
  // --clean its behaviour for free.
  const { error: delErr, count } = await db
    .from('moments')
    .delete({ count: 'exact' })
    .eq('user_id', userId)
    .eq('desire_text', SEED_TAG);
  if (delErr) throw delErr;
  console.log(`Removed ${count ?? 0} previously seeded row(s) for ${userId}.`);

  if (clean) {
    console.log('Clean-only run — done.');
    return;
  }

  const payload = rows(userId);
  const { error: insErr, data } = await db.from('moments').insert(payload).select('id');
  if (insErr) throw insErr;

  console.log(`Seeded ${data?.length ?? 0} moments for ${userId}.`);
  console.log('Home will now show: Today (A morning in Lisbon), 2 Coming-for-you,');
  console.log('Favorites (2) + On demand (2) collections, and 4 Recently-played rows.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
