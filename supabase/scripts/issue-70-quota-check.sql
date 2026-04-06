-- Run in Supabase SQL Editor (Tokyo project) for Issue #70 free-tier / capacity check.
-- Compare results to https://supabase.com/docs/guides/platform/billing-on-supabase

select pg_size_pretty(pg_database_size(current_database())) as database_total;

-- Approximate storage bucket usage (public + storage metadata)
select
  bucket_id,
  count(*) as object_count,
  pg_size_pretty(coalesce(sum((metadata->>'size')::bigint), 0)) as approx_bytes_from_metadata
from storage.objects
group by bucket_id
order by bucket_id;
