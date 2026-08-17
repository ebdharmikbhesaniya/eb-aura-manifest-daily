-- Grant hardening (2026-08-17) — restoring the second security layer.
--
-- Audit of the hosted database found `anon` and `authenticated` holding
-- ALL PRIVILEGES on every table in `public`. No data was exposed: RLS is
-- enabled everywhere, every policy is `(select auth.uid()) = user_id`, and
-- `auth.uid()` is NULL for `anon`, so an unauthenticated caller reads zero
-- rows. Verified against the live database before writing this.
--
-- But that is the whole problem. The baseline migration is explicit that grants
-- are a SECOND layer, not a formality:
--
--     "`anon` is deliberately granted NOTHING. … Defense in depth: even if a
--      policy were dropped by mistake, unauthenticated access still fails."
--
-- With ALL granted to `anon`, RLS is the ONLY thing between the anon key —
-- which ships inside the app bundle and sits in `eas.json`, entirely public —
-- and every row in the database. One dropped or mis-scoped policy would be a
-- full disclosure rather than a contained bug. That margin is what this
-- migration puts back.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ROOT CAUSE, and why the earlier migrations did not prevent it
-- ─────────────────────────────────────────────────────────────────────────────
--
-- DEFAULT PRIVILEGES on `public` grant `arwdDxtm` (all) on every NEW table to
-- anon, authenticated and service_role. So each `create table` in this
-- directory arrived already fully granted, and the careful `grant select …` /
-- `grant update (played_at, …)` blocks that follow were additive on top of an
-- ALL that was already there — decorative rather than restrictive. Nothing in
-- the migrations was wrong; the floor underneath them was higher than assumed.
--
-- Section 3 lowers that floor, so the explicit grant block each migration
-- already writes becomes the authoritative statement it was meant to be.
--
-- CONSEQUENCE TO KNOW ABOUT: after this, a new table is unreachable by the API
-- until a migration grants it explicitly. That is the convention this directory
-- already follows (every migration has a GRANTs section), but a table created
-- through the Supabase dashboard will now need its grants written by hand.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. anon holds nothing
-- ─────────────────────────────────────────────────────────────────────────────
-- `anon` means no JWT at all. Anonymous SIGN-IN users (00 §D2) carry the
-- `authenticated` role, not this one, so nothing in the product regresses.
-- USAGE on the schema is deliberately left in place: PostgREST needs it to
-- resolve the role at all, and it conveys no access to data on its own.

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. authenticated holds exactly what the migrations declare
-- ─────────────────────────────────────────────────────────────────────────────
-- Revoke-then-grant so the end state is declared rather than inherited, and so
-- re-running converges on the same grants whatever the database started from.
-- The extras being removed are TRUNCATE, REFERENCES and TRIGGER on every table
-- (never intended anywhere), plus UPDATE on `favorites` and DELETE on
-- `notification_prefs`, which no migration asks for.

revoke all on all tables in schema public from authenticated;

-- ── Her own rows: full CRUD (02 §5 baseline pattern) ────────────────────────
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.onboarding_answers to authenticated;
grant select, insert, update, delete on public.people to authenticated;
grant select, insert, update, delete on public.memory_items to authenticated;
grant select, insert, update, delete on public.exact_phrases to authenticated;
grant select, insert, update, delete on public.never_include to authenticated;
grant select, insert, update, delete on public.gratitude_entries to authenticated;
grant select, insert, update, delete on public.notification_tokens to authenticated;

-- Favouriting is add-or-remove; there is no such thing as editing one.
grant select, insert, delete on public.favorites to authenticated;

-- Prefs are created and edited, never deleted — the row IS the setting.
grant select, insert, update on public.notification_prefs to authenticated;

-- ── Generated content: read it, mark engagement on it, never author it ──────
-- The engagement-column rule (02 §5 exceptions). Restated here because section
-- 2's blanket revoke clears the column grants from 20260817000000 as well.
grant select on public.moments to authenticated;
grant update (played_at, completed_at, favorited_at) on public.moments to authenticated;

-- `status` stays out: keeping goes through `POST /v1/affirmations/:id/keep`,
-- which retires the siblings and writes memory in one operation.
grant select on public.affirmations to authenticated;
grant update (revealed_at, saved_at) on public.affirmations to authenticated;

-- Status polling only.
grant select on public.generation_jobs to authenticated;

-- Read the balance; spending happens inside the generation endpoints.
grant select on public.usage_credits to authenticated;

-- The one table where select-only is the entire point: a user who could write
-- this could grant herself premium.
grant select on public.subscription_state to authenticated;

-- Operational log she may read; an open is attributed from the client.
grant select on public.notification_sends to authenticated;
grant update (opened_at) on public.notification_sends to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. New tables arrive locked
-- ─────────────────────────────────────────────────────────────────────────────
-- Without this, the very next `create table` re-introduces everything section 1
-- and 2 just removed, and this migration becomes a one-off cleanup rather than
-- a fix.
--
-- Scoped to the `postgres` role's defaults, which is the role migrations run
-- as. `supabase_admin`'s equivalent defaults cannot be altered from here
-- (permission denied) and govern objects the Supabase platform itself creates,
-- which no migration in this directory does.

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

alter default privileges in schema public revoke all on tables from authenticated;
alter default privileges in schema public revoke all on sequences from authenticated;
alter default privileges in schema public revoke all on functions from authenticated;

-- service_role is left exactly as it is: it BYPASSES RLS by design and is the
-- only identity the backend uses (04 §1). Narrowing it would break generation.
