-- Storefront + cart: broadcast product row changes (e.g. unavailable_today) to anon/authenticated clients.
alter publication supabase_realtime add table public.products;
