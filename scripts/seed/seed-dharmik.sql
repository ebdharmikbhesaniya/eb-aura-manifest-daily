-- Fills the "Dharmik Bhesaniya" account so every tab has real content.
--
-- Scoped to ONE user id throughout. No audio is fabricated: moments land
-- `ready` with body text and no `audio_path`, which the app treats as a
-- first-class state — useLetter.ts is explicit that "a missing audio file is
-- NOT an error", and playback falls back to Read mode after five seconds.

\set uid '8cd6890d-9ba8-438b-af22-03ff56cbc8a3'

begin;

-- 1. Profile: the two fields onboarding left blank.
update public.profiles set
  dream_city = 'Dubai',
  free_text_note = 'Building quietly, shipping every week.'
 where user_id = :'uid' and (dream_city is null or dream_city = '');

-- 2. The Letter. All three died at TTS with their body text intact, so they sat
-- in `generating` forever and Home had nothing to show. The newest becomes
-- hers; the other two go to `replaced` so the library is not three copies of
-- one letter. Nothing is deleted.
update public.moments set status = 'replaced'
 where user_id = :'uid' and type = 'letter' and status = 'generating';

update public.moments set status = 'ready'
 where id = 'ea536048-6d41-4309-be8b-4b684971d106';

-- 3. Daily moments — Home's hero, the gallery, the collection.
insert into public.moments (user_id, type, status, title, body, scheduled_for, qa_report, played_at, completed_at)
values
-- created_at is set explicitly after insert (see the trailing UPDATE): a
-- multi-row INSERT stamps every row with the SAME transaction timestamp, and
-- fetchTodaysMoment orders by created_at, so without that step Home picks one
-- of these five at random — and if it lands on an older-dated one it renders
-- "forming"/"failed" instead of today.
 (:'uid', 'daily', 'ready', 'The morning you own',
  'It is early and the flat is quiet. You make coffee before the first message arrives, and for once the day starts on your terms rather than someone else''s. The laptop opens because you choose it. You are an explorer who happens to write software, and this morning both of those are true at the same time.',
  current_date, '{"prompt_version":"seed","supportive":false}'::jsonb, now() - interval '3 hours', now() - interval '3 hours'),

 (:'uid', 'daily', 'ready', 'Enough, and then some',
  'The transfer lands while you are making breakfast. You look at it once and then put the phone face down, because the number is no longer the thing that decides how the day feels. Financial freedom turned out to be quieter than you imagined. It sounds like not checking.',
  current_date - 1, '{"prompt_version":"seed","supportive":false}'::jsonb, now() - interval '1 day', now() - interval '1 day'),

 (:'uid', 'daily', 'ready', 'A window worth the wait',
  'Somewhere with a view — that was the whole brief, and here it is. Morning light across the desk, the city doing its work below, and you doing yours. The explorer in you is satisfied by the horizon. The engineer is satisfied by the setup.',
  current_date - 2, '{"prompt_version":"seed","supportive":false}'::jsonb, now() - interval '2 days', null),

 (:'uid', 'daily', 'ready', 'The week you stopped counting',
  'You notice, somewhere around Thursday, that you have not done the mental arithmetic once. Not at the shop, not at dinner. The habit loosened before the balance did, which is the part nobody tells you.',
  current_date - 3, '{"prompt_version":"seed","supportive":false}'::jsonb, null, null),

 (:'uid', 'ondemand', 'ready', 'Built, not waited for',
  'The thing you were building on the side is the thing that pays now. It did not arrive; you assembled it, one evening at a time, while the day job kept the lights on. You are still an explorer. You just financed the expedition yourself.',
  current_date - 4, '{"prompt_version":"seed","supportive":false}'::jsonb, now() - interval '4 days', now() - interval '4 days');

-- 4. People — the Profile sheet, and the strongest token generation has.
insert into public.people (user_id, name, descriptor, active) values
 (:'uid', 'Dixit',  'steady', true),
 (:'uid', 'Tushar', 'honest', true),
 (:'uid', 'Maa',    'home',   true);

-- 5. Gratitude — the week dots on Home and the history screen. One gap
-- (current_date - 5) on purpose, so the dots read as a real week rather than a
-- perfect streak.
insert into public.gratitude_entries (user_id, entry, entry_date, prompt_shown, prompt_was_personalized) values
 (:'uid', 'Shipped the thing I said I would ship.', current_date, 'What went right today?', false),
 (:'uid', 'Chai on the balcony before anyone was awake.', current_date - 1, 'What did you notice today?', true),
 (:'uid', 'Dixit called for no reason at all.', current_date - 2, 'Who made today lighter?', true),
 (:'uid', 'The bug that took three days finally made sense.', current_date - 3, 'What went right today?', false),
 (:'uid', 'Walked instead of taking the auto. Good decision.', current_date - 4, 'What did you notice today?', false),
 (:'uid', 'Maa''s food. Nothing else needed saying.', current_date - 6, 'Who made today lighter?', true),
 (:'uid', 'Said no to something and did not explain myself.', current_date - 7, 'What went right today?', false)
on conflict (user_id, entry_date) do nothing;

-- 6. Affirmations — a kept collection plus today's card.
insert into public.affirmations (user_id, kind, status, text, why_line, technique, goal_area, revealed_at, saved_at) values
 (:'uid', 'daily', 'kept',
  'I build steadily, and what I build holds.',
  'From your words: you are an explorer who ships.', 'identity', null, now() - interval '2 hours', now() - interval '2 hours'),
 (:'uid', 'daily', 'kept',
  'Money is a tool I am learning to hold without fear.',
  'Named gently — you told Aura money is the weight right now.', 'reframe', null, now() - interval '1 day', now() - interval '1 day'),
 (:'uid', 'guided', 'kept',
  'I am allowed to want more than enough.',
  'From your words: financial freedom.', 'identity', 'Money', now() - interval '3 days', now() - interval '3 days'),
 (:'uid', 'guided', 'kept',
  'Every week I ship, I am becoming the person who arrives.',
  'From your words: explorer, engineer, both.', 'process', 'Career', now() - interval '5 days', now() - interval '5 days');

-- 7. Memory — what the "What Aura Knows" screen renders.
insert into public.memory_items (user_id, category, tier, content, verbatim, source, emotional_weight) values
 (:'uid', 'place_lifestyle', 'permanent', 'Your dream city is Dubai', 'Dubai', 'profile_edit', 4),
 (:'uid', 'person', 'permanent', 'Dixit is someone steady in your life', 'Dixit', 'onboarding', 4),
 (:'uid', 'person', 'permanent', 'Tushar is someone honest in your life', 'Tushar', 'onboarding', 3),
 (:'uid', 'person', 'permanent', 'Maa is home to you', 'Maa', 'onboarding', 5),
 (:'uid', 'preference', 'evolving', 'You prefer moments that stay close to your real reach', null, 'refine', 3),
 (:'uid', 'preference', 'evolving', 'You kept an affirmation about building steadily', 'I build steadily, and what I build holds.', 'system', 3),
 (:'uid', 'gratitude_ref', 'evolving', 'You are grateful for chai on the balcony before anyone is awake', 'Chai on the balcony before anyone was awake.', 'gratitude', 3),
 (:'uid', 'gratitude_ref', 'evolving', 'You are grateful when Dixit calls for no reason', 'Dixit called for no reason at all.', 'gratitude', 4),
 (:'uid', 'dream', 'evolving', 'You are building something on the side that could pay for itself', null, 'manifest', 4);

-- 8. Exact phrases — the personalization fuel.
insert into public.exact_phrases (user_id, phrase, source) values
 (:'uid', 'Dubai', 'profile_edit'),
 (:'uid', 'financial freedom', 'onboarding'),
 (:'uid', 'shipping every week', 'profile_edit')
on conflict (user_id, lower(phrase)) do nothing;

-- 9. Never-include — so that screen is not empty.
insert into public.never_include (user_id, term) values
 (:'uid', 'salary'),
 (:'uid', 'debt')
on conflict (user_id, lower(term)) do nothing;


-- 10. Deterministic ordering. A multi-row INSERT gives every row the same
-- transaction timestamp, and both `fetchTodaysMoment` and `useTodaysAffirmation`
-- pick with `order by created_at desc limit 1`. Left as-is, Home shows a random
-- one of the five moments — and when that one is dated earlier than today, it
-- renders the "didn't come through / Try again" state instead of the moment.
update public.moments
   set created_at = (scheduled_for::timestamp + interval '2 hours 30 minutes') at time zone 'UTC'
 where user_id = :'uid' and qa_report->>'prompt_version' = 'seed' and scheduled_for is not null;

update public.affirmations
   set created_at = coalesce(saved_at, now())
 where user_id = :'uid' and saved_at is not null;

commit;
