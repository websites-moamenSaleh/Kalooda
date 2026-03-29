-- Categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  image_url text
);

-- Products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  stock_quantity integer not null default 0,
  ingredients text,
  allergens text[] default '{}',
  image_url text
);

-- Orders
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  display_id text unique not null,
  customer_name text not null,
  customer_phone text,
  items jsonb not null default '[]',
  total_price numeric(10,2) not null default 0,
  status text not null default 'pending'
    check (status in ('pending','assigned','out_for_delivery','delivered')),
  created_at timestamptz not null default now()
);

-- Deliveries
create table if not exists deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  driver_name text not null,
  driver_phone text,
  status text not null default 'accepted'
    check (status in ('accepted','declined')),
  timestamp timestamptz not null default now()
);

-- Enable realtime on orders and deliveries
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table deliveries;

-- Seed categories (UUIDs auto-generated)
insert into categories (name, slug, image_url) values
  ('Chocolates', 'chocolates', '/images/chocolates.jpg'),
  ('Gummies', 'gummies', '/images/gummies.jpg'),
  ('Hard Candy', 'hard-candy', '/images/hard-candy.jpg'),
  ('Pastries', 'pastries', '/images/pastries.jpg');

-- Seed products (reference categories by slug)
insert into products (category_id, name, description, price, stock_quantity, ingredients, allergens, image_url) values
  ((select id from categories where slug = 'chocolates'), 'Midnight Dark Truffle', 'Rich, velvety dark chocolate with a smooth ganache center.', 12.99, 50, '70% Cocoa, Heavy Cream, Soy Lecithin, Vanilla extract', '{"dairy","soy"}', '/images/dark-truffle.jpg'),
  ((select id from categories where slug = 'gummies'), 'Sour Watermelon Belts', 'Tangy and chewy belts with a sugar coating.', 5.50, 120, 'Sugar, Glucose Syrup, Wheat Flour, Malic Acid', '{"gluten"}', '/images/watermelon-belts.jpg'),
  ((select id from categories where slug = 'chocolates'), 'Hazelnut Praline Box', 'Creamy hazelnut praline wrapped in premium milk chocolate. A box of 12.', 18.99, 30, 'Milk Chocolate, Hazelnuts, Sugar, Cocoa Butter, Soy Lecithin', '{"dairy","nuts","soy"}', '/images/hazelnut-praline.jpg'),
  ((select id from categories where slug = 'gummies'), 'Peach Ring Gummies', 'Soft peach-flavored rings dusted with sour sugar crystals.', 4.99, 200, 'Sugar, Corn Syrup, Gelatin, Citric Acid, Natural Flavors', '{}', '/images/peach-rings.jpg'),
  ((select id from categories where slug = 'hard-candy'), 'Rainbow Lollipop', 'A swirl of fruit flavors in a classic lollipop. Perfect for kids.', 2.50, 300, 'Sugar, Corn Syrup, Citric Acid, Artificial Colors & Flavors', '{}', '/images/lollipop.jpg'),
  ((select id from categories where slug = 'hard-candy'), 'Honey & Lemon Drops', 'Soothing hard candy with real honey and a citrus zing.', 3.99, 150, 'Sugar, Honey, Lemon Juice Concentrate, Natural Flavors', '{}', '/images/honey-lemon.jpg'),
  ((select id from categories where slug = 'pastries'), 'Pistachio Baklava Box', 'Flaky phyllo pastry layers filled with crushed pistachios and honey syrup.', 15.99, 25, 'Phyllo Dough, Pistachios, Butter, Sugar, Honey, Rose Water', '{"gluten","dairy","nuts"}', '/images/baklava.jpg'),
  ((select id from categories where slug = 'pastries'), 'Strawberry Cream Éclair', 'Light choux pastry filled with strawberry cream and topped with white chocolate.', 6.50, 40, 'Flour, Butter, Eggs, Cream, Strawberries, White Chocolate, Sugar', '{"gluten","dairy","eggs"}', '/images/eclair.jpg');

-- Seed orders (reference product names in JSONB, no FK needed)
insert into orders (display_id, customer_name, customer_phone, items, total_price, status) values
  ('ORD-7721', 'George', '+123456789', '[{"product_name":"Midnight Dark Truffle","quantity":2,"unit_price":12.99}]', 25.98, 'pending'),
  ('ORD-7722', 'Sarah', '+198765432', '[{"product_name":"Hazelnut Praline Box","quantity":1,"unit_price":18.99},{"product_name":"Rainbow Lollipop","quantity":4,"unit_price":2.50}]', 28.99, 'assigned'),
  ('ORD-7723', 'Ahmed', '+112233445', '[{"product_name":"Pistachio Baklava Box","quantity":2,"unit_price":15.99}]', 31.98, 'out_for_delivery');
