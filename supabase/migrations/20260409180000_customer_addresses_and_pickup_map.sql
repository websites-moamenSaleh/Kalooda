create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(trim(label)) > 0 and char_length(trim(label)) <= 40),
  formatted_address text not null check (char_length(trim(formatted_address)) > 0 and char_length(trim(formatted_address)) <= 500),
  latitude numeric(9,6) not null check (latitude between -90 and 90),
  longitude numeric(9,6) not null check (longitude between -180 and 180),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_addresses_user_id_idx
  on public.customer_addresses (user_id);

create unique index if not exists customer_addresses_user_default_idx
  on public.customer_addresses (user_id)
  where is_default = true;

create or replace function public.touch_customer_address_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_customer_address_touch on public.customer_addresses;
create trigger trg_customer_address_touch
before update on public.customer_addresses
for each row execute function public.touch_customer_address_updated_at();

create or replace function public.enforce_customer_addresses_max_five()
returns trigger
language plpgsql
as $$
declare
  addr_count integer;
begin
  select count(*)
    into addr_count
  from public.customer_addresses
  where user_id = new.user_id;

  if addr_count >= 5 then
    raise exception 'ADDRESS_LIMIT_REACHED'
      using errcode = 'P0001',
      hint = 'A user can store at most five addresses.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_customer_addresses_max_five on public.customer_addresses;
create trigger trg_customer_addresses_max_five
before insert on public.customer_addresses
for each row execute function public.enforce_customer_addresses_max_five();

create or replace function public.normalize_customer_address_default()
returns trigger
language plpgsql
as $$
declare
  has_default boolean;
begin
  if tg_op = 'INSERT' then
    if new.is_default = true then
      update public.customer_addresses
        set is_default = false
      where user_id = new.user_id
        and id <> new.id
        and is_default = true;
      return new;
    end if;

    select exists(
      select 1 from public.customer_addresses
      where user_id = new.user_id
        and is_default = true
    ) into has_default;

    if not has_default then
      new.is_default = true;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.is_default = true then
      update public.customer_addresses
        set is_default = false
      where user_id = new.user_id
        and id <> new.id
        and is_default = true;
    elsif old.is_default = true and new.is_default = false then
      update public.customer_addresses
        set is_default = true
      where id = (
        select id
        from public.customer_addresses
        where user_id = new.user_id
          and id <> new.id
        order by created_at asc
        limit 1
      );
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_customer_addresses_default on public.customer_addresses;
create trigger trg_customer_addresses_default
before insert or update on public.customer_addresses
for each row execute function public.normalize_customer_address_default();

create or replace function public.ensure_customer_default_after_delete()
returns trigger
language plpgsql
as $$
begin
  if old.is_default then
    update public.customer_addresses
      set is_default = true
    where id = (
      select id
      from public.customer_addresses
      where user_id = old.user_id
      order by created_at asc
      limit 1
    );
  end if;
  return old;
end;
$$;

drop trigger if exists trg_customer_addresses_delete_default on public.customer_addresses;
create trigger trg_customer_addresses_delete_default
after delete on public.customer_addresses
for each row execute function public.ensure_customer_default_after_delete();

alter table public.customer_addresses enable row level security;

create policy "Users can read own customer addresses"
  on public.customer_addresses for select
  using (auth.uid() = user_id);

create policy "Users can insert own customer addresses"
  on public.customer_addresses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own customer addresses"
  on public.customer_addresses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own customer addresses"
  on public.customer_addresses for delete
  using (auth.uid() = user_id);

create table if not exists public.business_settings (
  id boolean primary key default true check (id = true),
  pickup_name text,
  pickup_address text,
  pickup_latitude numeric(9,6),
  pickup_longitude numeric(9,6),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.business_settings enable row level security;

create policy "Business settings are readable by authenticated users"
  on public.business_settings for select
  using (auth.role() = 'authenticated');

create policy "Business settings are writable by admins"
  on public.business_settings for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  ));

insert into public.business_settings (id, pickup_name, pickup_address, pickup_latitude, pickup_longitude)
values (
  true,
  coalesce(nullif(current_setting('app.pickup_name', true), ''), 'Kalooda'),
  nullif(current_setting('app.pickup_address', true), ''),
  nullif(current_setting('app.pickup_latitude', true), '')::numeric,
  nullif(current_setting('app.pickup_longitude', true), '')::numeric
)
on conflict (id) do nothing;

alter table public.orders
  add column if not exists customer_address_id uuid references public.customer_addresses(id) on delete set null,
  add column if not exists delivery_latitude numeric(9,6),
  add column if not exists delivery_longitude numeric(9,6),
  add column if not exists delivery_formatted_address text;
