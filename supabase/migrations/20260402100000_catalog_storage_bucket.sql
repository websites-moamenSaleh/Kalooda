-- Public bucket for category/product images (URLs stored in categories.image_url / products.image_url)
insert into storage.buckets (id, name, public)
values ('catalog', 'catalog', true)
on conflict (id) do update set public = excluded.public;

-- Allow anyone to read catalog objects (required for storefront <img src>)
drop policy if exists "catalog_images_public_read" on storage.objects;
create policy "catalog_images_public_read"
on storage.objects for select
to public
using (bucket_id = 'catalog');
