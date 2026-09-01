-- Onboarding v5: the goal question allows up to THREE picks (design Q1,
-- "Pick up to three"). `values` was capped at two by the original check.
alter table public.profiles drop constraint if exists profiles_values_check;
alter table public.profiles
  add constraint profiles_values_check
  check (values is null or array_length(values, 1) <= 3);
