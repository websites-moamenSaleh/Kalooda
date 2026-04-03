-- Remove legacy test auth user (no-op if already absent).
-- Auth Admin API list/lookup fails for this row; delete via SQL is reliable.
delete from auth.users
where email = 'abed.test@kalooda.demo';
