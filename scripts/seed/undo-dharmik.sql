-- Undo for seed-dharmik.sql. Removes only the seeded rows, scoped to one user.
--
-- Matches on the exact literal values the seed inserted, so anything the app
-- has written since — a real moment, a gratitude entry she typed herself — is
-- left alone. Run this if you want the account back the way it was.

\set uid '8cd6890d-9ba8-438b-af22-03ff56cbc8a3'

begin;

delete from public.moments
 where user_id = :'uid'
   and qa_report->>'prompt_version' = 'seed';

-- Put the Letter back the way it was found: all three in `generating`.
update public.moments set status = 'generating'
 where user_id = :'uid' and type = 'letter' and status in ('ready', 'replaced');

delete from public.people
 where user_id = :'uid' and name in ('Dixit', 'Tushar', 'Maa');

delete from public.gratitude_entries
 where user_id = :'uid' and entry in (
   'Shipped the thing I said I would ship.',
   'Chai on the balcony before anyone was awake.',
   'Dixit called for no reason at all.',
   'The bug that took three days finally made sense.',
   'Walked instead of taking the auto. Good decision.',
   'Maa''s food. Nothing else needed saying.',
   'Said no to something and did not explain myself.');

delete from public.affirmations
 where user_id = :'uid' and text in (
   'I build steadily, and what I build holds.',
   'Money is a tool I am learning to hold without fear.',
   'I am allowed to want more than enough.',
   'Every week I ship, I am becoming the person who arrives.');

delete from public.memory_items
 where user_id = :'uid' and content in (
   'Your dream city is Dubai',
   'Dixit is someone steady in your life',
   'Tushar is someone honest in your life',
   'Maa is home to you',
   'You prefer moments that stay close to your real reach',
   'You kept an affirmation about building steadily',
   'You are grateful for chai on the balcony before anyone is awake',
   'You are grateful when Dixit calls for no reason',
   'You are building something on the side that could pay for itself');

delete from public.exact_phrases
 where user_id = :'uid' and phrase in ('Dubai', 'financial freedom', 'shipping every week');

delete from public.never_include
 where user_id = :'uid' and term in ('salary', 'debt');

update public.profiles set dream_city = '', free_text_note = ''
 where user_id = :'uid';

commit;
