-- Run once in Frankfurt project: SQL Editor
-- Fixes category/product image_url still pointing at Tokyo after row copy.
-- Or from repo (uses .env.local): npm run rewrite:image-urls

update public.categories
set image_url = replace(
  image_url,
  'https://nnciyjfqoggfavfettbm.supabase.co',
  'https://mxbnmoagdufitnwrmsrn.supabase.co'
)
where image_url like '%nnciyjfqoggfavfettbm.supabase.co%';

update public.products
set image_url = replace(
  image_url,
  'https://nnciyjfqoggfavfettbm.supabase.co',
  'https://mxbnmoagdufitnwrmsrn.supabase.co'
)
where image_url like '%nnciyjfqoggfavfettbm.supabase.co%';
