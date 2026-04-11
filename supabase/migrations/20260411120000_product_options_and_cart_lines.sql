-- Issue #123: reusable product options, junction overrides, cart line identity (options snapshot).

-- ---------------------------------------------------------------------------
-- Super-admin helper (options CRUD is super_admin-only; catalog reads stay public)
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'super_admin'
  );
$$;

grant execute on function public.is_super_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Option catalog
-- ---------------------------------------------------------------------------
create type public.product_option_type as enum ('single', 'multiple');

create table public.options (
  id uuid primary key default gen_random_uuid(),
  type public.product_option_type not null,
  title_en text not null,
  title_ar text,
  show_to_courier boolean not null default false,
  pos_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.option_choices (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.options (id) on delete cascade,
  name_en text not null,
  name_ar text,
  price_markup numeric(10, 2) not null default 0,
  -- When null, inherit product/store VAT rules. v1: no additional VAT layer applied in app.
  vat_percentage numeric(5, 2),
  pos_id text,
  is_default boolean not null default false,
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index option_choices_option_id_idx on public.option_choices (option_id);
create index option_choices_option_sort_idx on public.option_choices (option_id, sort_order);

create table public.product_options_junction (
  product_id uuid not null references public.products (id) on delete cascade,
  option_id uuid not null references public.options (id) on delete cascade,
  sort_order integer not null default 0,
  min_select integer not null default 1,
  max_select integer not null default 1,
  items_free integer not null default 0,
  must_select_count integer not null default 0,
  hidden_conditional jsonb,
  display_name_en text,
  display_name_ar text,
  pos_id text,
  primary key (product_id, option_id)
);

create index product_options_junction_product_sort_idx
  on public.product_options_junction (product_id, sort_order);

-- ---------------------------------------------------------------------------
-- RLS: public read for storefront + Realtime; writes super_admin only
-- ---------------------------------------------------------------------------
alter table public.options enable row level security;
alter table public.option_choices enable row level security;
alter table public.product_options_junction enable row level security;

create policy "options_select_public"
  on public.options for select
  to anon, authenticated
  using (true);

create policy "options_write_super_admin"
  on public.options for insert
  to authenticated
  with check (public.is_super_admin());

create policy "options_update_super_admin"
  on public.options for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "options_delete_super_admin"
  on public.options for delete
  to authenticated
  using (public.is_super_admin());

create policy "option_choices_select_public"
  on public.option_choices for select
  to anon, authenticated
  using (true);

create policy "option_choices_insert_super_admin"
  on public.option_choices for insert
  to authenticated
  with check (public.is_super_admin());

create policy "option_choices_update_super_admin"
  on public.option_choices for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "option_choices_delete_super_admin"
  on public.option_choices for delete
  to authenticated
  using (public.is_super_admin());

create policy "product_options_junction_select_public"
  on public.product_options_junction for select
  to anon, authenticated
  using (true);

create policy "product_options_junction_insert_super_admin"
  on public.product_options_junction for insert
  to authenticated
  with check (public.is_super_admin());

create policy "product_options_junction_update_super_admin"
  on public.product_options_junction for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "product_options_junction_delete_super_admin"
  on public.product_options_junction for delete
  to authenticated
  using (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- cart_items: one row per line (multiple lines per product allowed)
-- ---------------------------------------------------------------------------
alter table public.cart_items add column if not exists id uuid;
alter table public.cart_items add column if not exists line_options jsonb not null default '{"selections":{}}'::jsonb;

update public.cart_items set id = gen_random_uuid() where id is null;

alter table public.cart_items alter column id set not null;
alter table public.cart_items alter column id set default gen_random_uuid();

alter table public.cart_items drop constraint cart_items_pkey;
alter table public.cart_items add primary key (id);

create index if not exists cart_items_user_product_idx
  on public.cart_items (user_id, product_id);

comment on column public.cart_items.line_options is
  'JSON: { selections: Record<optionId, choiceId[]>, snapshot: { choice_lines, options_subtotal, unit_price } }';

-- ---------------------------------------------------------------------------
-- Realtime (idempotent add)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'options'
  ) then
    alter publication supabase_realtime add table public.options;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'option_choices'
  ) then
    alter publication supabase_realtime add table public.option_choices;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'product_options_junction'
  ) then
    alter publication supabase_realtime add table public.product_options_junction;
  end if;
end $$;
