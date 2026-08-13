#!/usr/bin/env node
/**
 * Bootstrap a fresh local PostHog (2026-08-10) — non-interactive first-run setup.
 *
 * A brand-new PostHog has no org/project/keys. This creates the first user +
 * organization + project via the API (Django CSRF flow) and prints the two keys
 * the rest of the tooling needs:
 *   - project ingestion key  (phc_…)  → the app + smoke.mjs
 *   - personal API key       (phx_…)  → provision.mjs
 *
 *   POSTHOG_HOST=http://localhost:8000 node infra/posthog/bootstrap.mjs
 *
 * Idempotent-ish: if signup fails because a user already exists, it says so —
 * grab the keys from the UI (Settings) in that case.
 */

const HOST = (process.env.POSTHOG_HOST || 'http://localhost:8000').replace(/\/$/, '');
const EMAIL = process.env.PH_EMAIL || 'dev@aura.local';
const PASSWORD = process.env.PH_PASSWORD || 'aura-local-dev-12345';

const jar = new Map();
function remember(res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
  }
}
const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');

async function req(method, path, body) {
  const res = await fetch(`${HOST}${path}`, {
    method,
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(),
      Origin: HOST,
      Referer: `${HOST}/`,
      ...(jar.get('csrftoken') ? { 'X-CSRFToken': jar.get('csrftoken') } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  remember(res);
  return res;
}

async function main() {
  console.log(`→ Bootstrapping PostHog at ${HOST}\n`);

  // 1. Prime the CSRF cookie.
  await req('GET', '/signup');
  if (!jar.get('csrftoken')) {
    // Some builds only set it on an API GET.
    await req('GET', '/api/users/@me/');
  }

  // 2. Create the first user + org + project.
  const signup = await req('POST', '/api/signup/', {
    first_name: 'Aura Dev',
    email: EMAIL,
    password: PASSWORD,
    organization_name: 'Aura',
    role_at_organization: 'engineering',
  });
  if (!signup.ok) {
    const text = await signup.text();
    if (signup.status === 400 && /already/i.test(text)) {
      console.error('! A user already exists on this instance.');
      console.error('  Grab the keys from the UI: Settings → Project (phc_…) and');
      console.error('  Settings → Personal API keys (phx_…). Skipping.');
      process.exit(2);
    }
    throw new Error(`signup → ${signup.status}: ${text.slice(0, 300)}`);
  }
  console.log('  ✓ created user + organization + project');

  // 3. Read the project ingestion token.
  const projRes = await req('GET', '/api/projects/@current/');
  if (!projRes.ok) throw new Error(`projects/@current → ${projRes.status}`);
  const proj = await projRes.json();
  const projectId = proj.id;
  const ingestionKey = proj.api_token;

  // 4. Mint a personal API key for provisioning.
  const keyRes = await req('POST', '/api/personal_api_keys/', {
    label: 'aura-provision',
    scopes: ['feature_flag:write', 'dashboard:write', 'insight:write', 'project:read'],
  });
  let personalKey = '(create one in Settings → Personal API keys)';
  if (keyRes.ok) personalKey = (await keyRes.json()).value;
  else console.error(`  ! could not mint personal key (${keyRes.status}); make one in the UI`);

  console.log('\n✓ Bootstrap done. Save these:\n');
  console.log(`  POSTHOG_PROJECT_ID=${projectId}`);
  console.log(`  POSTHOG_PROJECT_API_KEY=${ingestionKey}   # app + smoke.mjs (phc_)`);
  console.log(`  POSTHOG_PERSONAL_API_KEY=${personalKey}    # provision.mjs (phx_)`);
  console.log(`\n  UI login: ${HOST}  (${EMAIL} / ${PASSWORD})`);
}

main().catch((err) => {
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
});
