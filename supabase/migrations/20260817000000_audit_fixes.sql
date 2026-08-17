-- Audit follow-ups (2026-08-17).
--
-- Three corrections that need schema, each fixing a bug the application layer
-- could not close on its own.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. generation_jobs.started_at — the stale-job requeue needs a START time
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `requeueStaleJobs` re-queues jobs left `running` by a crashed instance, and it
-- was comparing `created_at` against the cutoff. `created_at` records when the
-- job was QUEUED and never changes, so a job that waited behind a full
-- concurrency queue and only just began running already looked stale — a boot
-- would re-queue work that was actively in flight, generating it twice.
--
-- Nullable rather than defaulted: a queued job has not started, and NULL says
-- that. A default of now() would make every freshly-inserted row claim a start
-- it has not had.

alter table public.generation_jobs
  add column started_at timestamptz;

comment on column public.generation_jobs.started_at is
  'When the worker began this attempt. NULL while queued. The stale-job requeue '
  'compares against THIS, not created_at — created_at is the queue time and never '
  'moves, so a long-queued job looked stale the moment it started running.';

-- The requeue scans running/retrying rows by start time.
create index generation_jobs_started_at_idx on public.generation_jobs (started_at)
  where status in ('running', 'retrying');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Content tables: reset `authenticated` to the engagement-column rule
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Two problems, one fix.
--
-- (a) `POST /v1/affirmations/:id/keep` exists because keeping one candidate has
--     to retire its siblings and write memory as one operation (07 §2).
--     Granting `status` to `authenticated` let a client set `kept` directly and
--     skip all of that, so the endpoint's justification did not hold from the
--     client side. Mobile only READS status (`useAffirmations` filters on it),
--     so nothing loses a capability.
--
-- (b) PRODUCTION HAD DRIFTED. The hosted database was found holding table-level
--     ALL PRIVILEGES for `authenticated` on every content table — the signature
--     of a `grant all on all tables in schema public` run by hand. That is not
--     what any migration in this directory asks for, and it silently defeats
--     the engagement-column rule (02 §5): a table-level UPDATE grant supersedes
--     column-level ones, so a column-level `revoke` against it is a NO-OP.
--     Revoking ALL first is what makes the re-grant below authoritative.
--
--     RLS kept the damage contained — `usage_credits`, `subscription_state` and
--     `generation_jobs` carry SELECT-only policies, so the stray write grants
--     were unreachable there, which is exactly the defence-in-depth the baseline
--     migration describes. But on `moments`, `affirmations` and
--     `notification_sends` an UPDATE policy does exist, so a user could rewrite
--     any column of her own rows: a moment's body, title or status, an
--     affirmation's text, a send's dedupe key.
--
-- Written as revoke-then-grant so the end state is declared rather than
-- inferred, and so re-running it converges on the same grants whatever the
-- database started from.

revoke all on public.moments from authenticated;
revoke all on public.affirmations from authenticated;
revoke all on public.generation_jobs from authenticated;
revoke all on public.usage_credits from authenticated;
revoke all on public.subscription_state from authenticated;
revoke all on public.notification_sends from authenticated;

-- Re-grant exactly what 20260717040000 / 20260720000000 / 20260720300000 intend.

-- Content exists solely through the pipeline; she marks engagement on it.
grant select on public.moments to authenticated;
grant update (played_at, completed_at, favorited_at) on public.moments to authenticated;

-- `status` is deliberately NOT here — see (a). Keeping goes through the endpoint.
grant select on public.affirmations to authenticated;
grant update (revealed_at, saved_at) on public.affirmations to authenticated;

-- Status polling only.
grant select on public.generation_jobs to authenticated;

-- Read her balance; spending happens inside the generation endpoints.
grant select on public.usage_credits to authenticated;

-- The one table where select-only is the whole point: a user who could write it
-- could grant herself premium.
grant select on public.subscription_state to authenticated;

-- Operational log she may read; an open is attributed from the client.
grant select on public.notification_sends to authenticated;
grant update (opened_at) on public.notification_sends to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. notification_tokens — a token is unique PER USER, not globally
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `expo_push_token text not null unique` plus a client-writable INSERT meant one
-- user could register a token belonging to somebody else's device and, because
-- the constraint is global, permanently block its real owner from registering
-- it. Scoping uniqueness to (user_id, expo_push_token) keeps the property the
-- constraint was actually for — no duplicate rows for one device on one account
-- — without letting one account reserve a string out of another's reach.
--
-- The constraint is found by name rather than assumed: Postgres names it
-- `notification_tokens_expo_push_token_key` for a column-level `unique`.

alter table public.notification_tokens
  drop constraint if exists notification_tokens_expo_push_token_key;

create unique index if not exists notification_tokens_user_token_key
  on public.notification_tokens (user_id, expo_push_token);
