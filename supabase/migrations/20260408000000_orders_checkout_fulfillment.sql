-- Issue #41: checkout fulfillment type, delivery address snapshot, payment method; saved address on profile.

alter table public.orders
  add column if not exists fulfillment_type text not null default 'delivery'
    check (fulfillment_type in ('delivery', 'pickup'));

alter table public.orders
  add column if not exists delivery_address text;

alter table public.orders
  add column if not exists payment_method text not null default 'cash_on_delivery'
    check (payment_method in ('cash_on_delivery'));

alter table public.profiles
  add column if not exists delivery_address text;
