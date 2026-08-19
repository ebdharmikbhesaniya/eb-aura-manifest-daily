-- Grants the "Dharmik Bhesaniya" account premium on the SERVER side.
--
-- This writes the same row a RevenueCat INITIAL_PURCHASE webhook would produce,
-- field for field — see `deriveSubscriptionUpdate` in
-- apps/backend/src/subscriptions/rc-event.ts. Writing it by hand rather than
-- inventing a shape means a real webhook arriving later simply overwrites this
-- with the truth instead of conflicting with it.
--
-- SCOPE: this unlocks the server. `EntitlementGuard` reads this table, so
-- POST /v1/generation/refine and POST /v1/generation/manifest will now accept
-- her requests instead of returning 402 entitlement_required.
--
-- It does NOT unlock the client UI. `useEntitlement` gates purely on the
-- RevenueCat SDK and never reads this table ("client gating is UX, server
-- gating is truth", 12 §4) — so the locked-feature sheets stay locked until
-- RevenueCat itself reports the entitlement. See the notes in the report.

\set uid '8cd6890d-9ba8-438b-af22-03ff56cbc8a3'

begin;

insert into public.subscription_state (
  user_id,
  rc_app_user_id,
  entitlement,
  product_id,
  period_type,
  expires_at,
  will_renew,
  last_event,
  last_event_at,
  lapsed_at
) values (
  :'uid',
  -- RC's app_user_id IS the Supabase user id (03 §4), so no aliasing table.
  :'uid',
  'premium',
  'aura_premium_annual',
  -- 'normal', not 'trial': a trial would put her in the day-5 trial-reminder
  -- cron and tell her a conversion date that is not real.
  'normal',
  now() + interval '1 year',
  true,
  'INITIAL_PURCHASE',
  now(),
  -- Must stay NULL. A non-null lapsed_at is what the win-back cron sweeps on,
  -- and it would send her a "come back" note about a subscription she has.
  null
)
on conflict (user_id) do update set
  rc_app_user_id = excluded.rc_app_user_id,
  entitlement    = excluded.entitlement,
  product_id     = excluded.product_id,
  period_type    = excluded.period_type,
  expires_at     = excluded.expires_at,
  will_renew     = excluded.will_renew,
  last_event     = excluded.last_event,
  last_event_at  = excluded.last_event_at,
  lapsed_at      = null;

commit;
