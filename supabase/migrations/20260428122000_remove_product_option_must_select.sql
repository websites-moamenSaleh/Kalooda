-- Replace legacy "must" requirements with min_select, then remove the redundant column.
update public.product_options_junction
set min_select = greatest(min_select, must_select_count)
where must_select_count > min_select;

alter table public.product_options_junction
drop column if exists must_select_count;
