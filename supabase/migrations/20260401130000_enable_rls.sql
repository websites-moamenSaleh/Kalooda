-- Row level security for public tables. Service role (API routes) bypasses RLS.
-- Admin dashboard Realtime uses the anon key with an admin JWT; those users need SELECT on orders.

create or replace function public.is_staff()
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
      and p.role in ('admin', 'super_admin')
  );
$$;
grant execute on function public.is_staff() to anon, authenticated;
-- Categories & products: catalog is public read; writes go through service role APIs.
alter table public.categories enable row level security;
create policy "Categories are publicly readable"
  on public.categories for select
  to anon, authenticated
  using (true);
alter table public.products enable row level security;
create policy "Products are publicly readable"
  on public.products for select
  to anon, authenticated
  using (true);
-- Orders: customers see their own; staff see all (admin UI + Realtime).
alter table public.orders enable row level security;
create policy "Staff can select all orders"
  on public.orders for select
  to authenticated
  using (public.is_staff());
create policy "Users can select own orders"
  on public.orders for select
  to authenticated
  using (user_id is not null and user_id = (select auth.uid()));
-- Deliveries: no direct client usage; staff may read for future tooling.
alter table public.deliveries enable row level security;
create policy "Staff can read deliveries"
  on public.deliveries for select
  to authenticated
  using (public.is_staff());
-- Drivers: managed via admin API (service role).
alter table public.drivers enable row level security;
create policy "Staff can read drivers"
  on public.drivers for select
  to authenticated
  using (public.is_staff());
create policy "Staff can insert drivers"
  on public.drivers for insert
  to authenticated
  with check (public.is_staff());
create policy "Staff can update drivers"
  on public.drivers for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());
create policy "Staff can delete drivers"
  on public.drivers for delete
  to authenticated
  using (public.is_staff());
-- Cart: RLS was enabled without policies; allow each user only their rows.
create policy "Users select own cart items"
  on public.cart_items for select
  to authenticated
  using (user_id = (select auth.uid()));
create policy "Users insert own cart items"
  on public.cart_items for insert
  to authenticated
  with check (user_id = (select auth.uid()));
create policy "Users update own cart items"
  on public.cart_items for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users delete own cart items"
  on public.cart_items for delete
  to authenticated
  using (user_id = (select auth.uid()));
