-- Issue #115 verification queries (run manually in Supabase SQL editor)

-- 1) Ensure table exists
select to_regclass('public.customer_addresses') as customer_addresses_table;

-- 2) Ensure one-default partial unique index exists
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'customer_addresses'
  and indexname = 'customer_addresses_user_default_idx';

-- 3) Ensure RLS is enabled
select relname, relrowsecurity
from pg_class
where relname in ('customer_addresses', 'business_settings');

-- 4) Ensure business settings row exists
select id, pickup_name, pickup_address, pickup_latitude, pickup_longitude
from public.business_settings
where id = true;

-- 5) Spot check address counts per user (should never exceed 5)
select user_id, count(*) as address_count
from public.customer_addresses
group by user_id
having count(*) > 5;
