-- Run on source (Tokyo) and target (Frankfurt) after migration; counts should match.

select 'categories' as tbl, count(*)::text as n from public.categories
union all select 'products', count(*)::text from public.products
union all select 'drivers', count(*)::text from public.drivers
union all select 'profiles', count(*)::text from public.profiles
union all select 'orders', count(*)::text from public.orders
union all select 'deliveries', count(*)::text from public.deliveries
union all select 'cart_items', count(*)::text from public.cart_items
order by tbl;
