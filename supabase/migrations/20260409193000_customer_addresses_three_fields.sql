alter table public.customer_addresses
  add column if not exists label_type text check (label_type in ('home', 'work', 'other')),
  add column if not exists custom_label text,
  add column if not exists city text,
  add column if not exists street_line text,
  add column if not exists building_number text;

update public.customer_addresses
set
  city = coalesce(city, 'Unknown'),
  street_line = coalesce(street_line, formatted_address),
  building_number = coalesce(building_number, 'N/A')
where city is null or street_line is null or building_number is null;

alter table public.customer_addresses
  alter column city set not null,
  alter column street_line set not null,
  alter column building_number set not null;

alter table public.customer_addresses
  alter column latitude drop not null,
  alter column longitude drop not null;

alter table public.customer_addresses
  alter column label drop not null;
