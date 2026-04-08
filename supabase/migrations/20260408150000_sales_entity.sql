create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  default_value numeric(10,2) not null,
  default_type text not null check (default_type in ('amount', 'percentage')),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  check (default_value >= 0),
  check (default_type <> 'percentage' or default_value <= 100)
);

create table if not exists public.sale_products (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  override_value numeric(10,2),
  override_type text check (override_type in ('amount', 'percentage')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sale_id, product_id),
  check (override_value is null or override_value >= 0),
  check (override_type is null or override_value is not null),
  check (override_type <> 'percentage' or override_value <= 100)
);

create index if not exists sales_start_end_idx on public.sales(start_at, end_at);
create index if not exists sales_ended_at_idx on public.sales(ended_at);
create index if not exists sale_products_product_idx on public.sale_products(product_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sales_touch_updated_at on public.sales;
create trigger sales_touch_updated_at
before update on public.sales
for each row execute function public.touch_updated_at();

drop trigger if exists sale_products_touch_updated_at on public.sale_products;
create trigger sale_products_touch_updated_at
before update on public.sale_products
for each row execute function public.touch_updated_at();

create or replace function public.enforce_sale_overlap_guard()
returns trigger
language plpgsql
as $$
declare
  current_sale record;
  conflict_sale record;
  conflict_product record;
begin
  select id, start_at, end_at, ended_at
  into current_sale
  from public.sales
  where id = new.sale_id;

  if current_sale.id is null then
    return new;
  end if;

  if current_sale.ended_at is not null then
    return new;
  end if;

  select s.id as sale_id, s.start_at, s.end_at
  into conflict_sale
  from public.sales s
  join public.sale_products sp on sp.sale_id = s.id
  where sp.product_id = new.product_id
    and s.id <> new.sale_id
    and s.ended_at is null
    and tstzrange(s.start_at, s.end_at, '[)') && tstzrange(current_sale.start_at, current_sale.end_at, '[)')
  limit 1;

  if conflict_sale.sale_id is null then
    return new;
  end if;

  select p.id, p.name
  into conflict_product
  from public.products p
  where p.id = new.product_id;

  raise exception using
    errcode = 'P0001',
    message = 'SALE_OVERLAP',
    detail = format(
      'product_id=%s;product_name=%s;sale_id=%s;conflict_sale_id=%s',
      new.product_id,
      coalesce(conflict_product.name, ''),
      new.sale_id,
      conflict_sale.sale_id
    );
end;
$$;

drop trigger if exists sale_overlap_guard on public.sale_products;
create trigger sale_overlap_guard
before insert or update on public.sale_products
for each row execute function public.enforce_sale_overlap_guard();
