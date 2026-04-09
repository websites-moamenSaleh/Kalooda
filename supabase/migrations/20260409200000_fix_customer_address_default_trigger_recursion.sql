create or replace function public.normalize_customer_address_default()
returns trigger
language plpgsql
as $$
declare
  has_default boolean;
begin
  -- Prevent recursive re-entry from updates triggered within this function.
  if pg_trigger_depth() > 1 then
    return new;
  end if;

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
      select 1
      from public.customer_addresses
      where user_id = new.user_id
        and is_default = true
    ) into has_default;

    if not has_default then
      new.is_default = true;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.is_default = true and old.is_default is distinct from true then
      update public.customer_addresses
         set is_default = false
       where user_id = new.user_id
         and id <> new.id
         and is_default = true;
      return new;
    end if;

    if old.is_default = true and new.is_default = false then
      select exists(
        select 1
        from public.customer_addresses
        where user_id = new.user_id
          and id <> new.id
          and is_default = true
      ) into has_default;

      if not has_default then
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
    end if;
  end if;

  return new;
end;
$$;
