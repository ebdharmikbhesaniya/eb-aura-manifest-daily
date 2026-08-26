-- A05 "feeling" onboarding answer — the safety-router input (general mood at
-- signup). Nullable text holding the choice KEY (e.g. 'anxious', 'stuck',
-- 'hopeful', 'good'); answers 'anxious'/'stuck' are the ones the gentle-content
-- router keys off. Written by completeOnboarding's profile patch, same path as
-- struggle/values. Kept as free text (not an enum) so the option set can evolve
-- without a type migration.
alter table public.profiles
  add column if not exists feeling text;
