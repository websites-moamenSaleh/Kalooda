-- Aligns local migration history with remote: version was applied on the remote
-- (e.g. SQL editor or another branch) before a matching file existed in this repo.
-- Safe no-op if already applied.
select 1;
