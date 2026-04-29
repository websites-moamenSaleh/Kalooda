-- sales / sale_products: all reads and writes go through service-role server code.
-- Enable RLS so direct PostgREST access as anon/authenticated is denied (no policies).

alter table public.sales enable row level security;
alter table public.sale_products enable row level security;
