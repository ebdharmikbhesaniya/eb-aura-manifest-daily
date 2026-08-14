import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Credential resolution for the provisioning scripts (2026-08-14).
 *
 * Precedence for each value: an explicit environment variable ALWAYS wins;
 * otherwise fall back to the personal API key `posthog-cli login` stored at
 * ~/.posthog/credentials.json. That lets `node provision.mjs` / `node
 * dashboards.mjs` run with zero key handling once the CLI is authenticated —
 * the token is read inside this process, never printed or put on a command line.
 */
function readCliCredentials() {
  try {
    const raw = fs.readFileSync(path.join(os.homedir(), '.posthog', 'credentials.json'), 'utf8');
    const c = JSON.parse(raw);
    const apiKey = c.personal_api_key || c.token || c.api_key || c.key || c.access_token || null;
    return {
      apiKey: apiKey && String(apiKey).startsWith('phx_') ? apiKey : null,
      host: c.host || null,
      projectId: c.env_id ?? c.project_id ?? c.projectId ?? null,
    };
  } catch {
    return { apiKey: null, host: null, projectId: null };
  }
}

const cli = readCliCredentials();

/** Personal API key: env var, else the posthog-cli key, else null. */
export function resolveApiKey() {
  return process.env.POSTHOG_PERSONAL_API_KEY || cli.apiKey || null;
}

/** API host (no trailing slash): env var, else the CLI host, else `fallback`. */
export function resolveHost(fallback = 'http://localhost:8000') {
  return (process.env.POSTHOG_HOST || cli.host || fallback).replace(/\/$/, '');
}

/** Project id: env var, else the CLI's env/project id, else `fallback`. */
export function resolveProjectId(fallback = '1') {
  return String(process.env.POSTHOG_PROJECT_ID || cli.projectId || fallback);
}

/** True when the key came from posthog-cli rather than an env var — for a one-line notice. */
export const usingCliKey = !process.env.POSTHOG_PERSONAL_API_KEY && !!cli.apiKey;
