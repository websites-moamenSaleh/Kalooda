alter table public.profiles
  add column if not exists preferred_language text
  check (
    preferred_language is null
    or preferred_language in ('en', 'ar')
  );
