-- ─────────────────────────────────────────────────────────────────────────────
-- Guided studio simplified (product 09 §9.3b, 2026-07-30)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- The guided affirmation flow dropped its "how do you want to feel?" and "how
-- should it sound?" steps — it is now one question (the goal) then three
-- candidates. Those two selections were the only writers of these columns, so
-- they are removed. `goal_area` stays: the card still shows "From your words:
-- <goal>", and the generator still anchors candidates to it.
--
-- `if exists` keeps this idempotent across environments where a prior manual
-- drop may already have happened.

alter table public.affirmations drop column if exists feeling;
alter table public.affirmations drop column if exists tone;
