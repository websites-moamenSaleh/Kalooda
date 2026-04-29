alter table public.orders
  add column if not exists delivery_token_expires_at timestamptz;

update public.orders
set delivery_token_expires_at = now() + interval '3 hours'
where delivery_token_expires_at is null
  and status not in ('completed', 'cancelled');
