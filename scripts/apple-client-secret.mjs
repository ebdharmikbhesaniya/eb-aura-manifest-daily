#!/usr/bin/env node
/**
 * Generates the Apple "client secret" JWT that Supabase's Apple provider asks for
 * in its **Secret Key (for OAuth)** field.
 *
 * YOU PROBABLY DO NOT NEED THIS. Aura signs in natively —
 * `supabase.auth.signInWithIdToken({ provider: 'apple' })` in
 * `apps/mobile/src/features/auth/session.ts` — and that path is gated only by the
 * provider toggle plus the **Client IDs** list (which must hold the BUNDLE id,
 * `com.aura.manifestdaily`). The secret is used by the OAuth/web redirect flow,
 * which this app never enters, and by Apple's token-revocation endpoint. Leave
 * the dashboard field EMPTY unless you are adding one of those.
 *
 * Apple caps the lifetime at 6 months, so this has to be re-run and re-pasted
 * twice a year — that is why it is a script and not a one-off paste.
 *
 * Usage:
 *   node scripts/apple-client-secret.mjs \
 *     --services-id com.aura.manifestdaily.signin \
 *     --team-id     Q8Z48Q7K2B \
 *     --key-id      M6968FYKG6 \
 *     --p8          apps/mobile/AuraAuthKey_M6968FYKG6.p8
 *
 * Two things this script CANNOT check for you, both of which make Apple reject
 * the result at runtime rather than here:
 *
 *   1. `--services-id` must be a **Services ID**, not the bundle id. It becomes
 *      the `sub` claim, and Apple matches it against a registered Services ID.
 *   2. `--p8` must be a **Sign in with Apple** key. An APNs key is also an EC
 *      P-256 `.p8` and signs perfectly well here — Apple just refuses it. Check
 *      the key's enabled services under Keys in the developer portal.
 */

import { createPrivateKey, createSign, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

/** Apple's hard ceiling on client-secret lifetime: 6 months (15777000s). */
const MAX_LIFETIME_SECONDS = 15_777_000;

const base64url = (input) => Buffer.from(input).toString('base64url');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, '');
    if (key) args[key] = argv[i + 1];
  }
  return args;
}

function die(message) {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
const servicesId = args['services-id'];
const teamId = args['team-id'];
const keyId = args['key-id'];
const p8Path = args.p8;

if (!servicesId || !teamId || !keyId || !p8Path) {
  die(
    'Missing arguments. All four are required:\n' +
      '      --services-id  the Services ID (NOT the bundle id)\n' +
      '      --team-id      Apple Team ID\n' +
      '      --key-id       Key ID of the Sign in with Apple key\n' +
      '      --p8           path to the .p8 private key',
  );
}

let privateKey;
try {
  privateKey = createPrivateKey(readFileSync(p8Path));
} catch (error) {
  die(`Could not read the private key at ${p8Path}: ${error.message}`);
}

// Apple issues EC P-256 keys and requires ES256. A key of any other shape is the
// wrong file entirely, and catching it here beats a opaque rejection from Apple.
if (
  privateKey.asymmetricKeyType !== 'ec' ||
  privateKey.asymmetricKeyDetails?.namedCurve !== 'prime256v1'
) {
  die(
    `${p8Path} is not an EC P-256 key (got ${privateKey.asymmetricKeyType}/` +
      `${privateKey.asymmetricKeyDetails?.namedCurve ?? 'unknown'}). Apple keys are EC P-256.`,
  );
}

if (servicesId === 'com.aura.manifestdaily') {
  die(
    'That is the BUNDLE id. `sub` must be a Services ID (e.g.\n' +
      '      com.aura.manifestdaily.signin), registered under Identifiers → Services IDs.',
  );
}

const issuedAt = Math.floor(Date.now() / 1000);
const expiresAt = issuedAt + MAX_LIFETIME_SECONDS;

const header = { alg: 'ES256', kid: keyId };
const payload = {
  iss: teamId,
  iat: issuedAt,
  exp: expiresAt,
  aud: 'https://appleid.apple.com',
  sub: servicesId,
  jti: randomUUID(),
};

const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

// EC signatures must be raw r||s for JOSE. Node emits DER by default, which Apple
// rejects as malformed — `ieee-p1363` is the JOSE encoding.
const signature = createSign('SHA256')
  .update(signingInput)
  .sign({ key: privateKey, dsaEncoding: 'ieee-p1363' })
  .toString('base64url');

console.log(`\n  Apple client secret (expires ${new Date(expiresAt * 1000).toDateString()}):\n`);
console.log(`${signingInput}.${signature}\n`);
console.log('  Paste into Supabase → Authentication → Providers → Apple → Secret Key (for OAuth).');
console.log('  Re-run before the expiry above, or web sign-in breaks.\n');
