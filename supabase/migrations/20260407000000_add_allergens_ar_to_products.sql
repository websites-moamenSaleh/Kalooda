ALTER TABLE products ADD COLUMN IF NOT EXISTS allergens_ar text[] DEFAULT '{}'::text[];
