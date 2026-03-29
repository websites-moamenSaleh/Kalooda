-- Add Arabic translation columns and availability toggle to products
alter table products add column if not exists name_ar text;
alter table products add column if not exists description_ar text;
alter table products add column if not exists ingredients_ar text;
alter table products add column if not exists unavailable_today boolean not null default false;
