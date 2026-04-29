-- Allow reusable options to source their choices from the currently available
-- products in a category instead of fixed option_choices rows.
alter table public.options
  add column if not exists choice_source text not null default 'manual',
  add column if not exists source_category_id uuid references public.categories (id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'options_choice_source_check'
      and conrelid = 'public.options'::regclass
  ) then
    alter table public.options
      add constraint options_choice_source_check
      check (choice_source in ('manual', 'category_products'));
  end if;
end $$;

create index if not exists options_source_category_id_idx
  on public.options (source_category_id)
  where source_category_id is not null;

comment on column public.options.choice_source is
  'manual = choices stored in option_choices; category_products = choices are available products from source_category_id with zero markup.';

comment on column public.options.source_category_id is
  'Category used when choice_source = category_products.';
