# SweetDrop — Backlog

## In Progress

## Up Next

### 1. Split admin into two pages
- **Dashboard** (`/admin`) — current order management view (no changes)
- **Functions** (`/admin/functions`) — super admin panel with:
  - Add / edit / remove products **with bilingual support (English & Arabic)**
    - Each product's `name`, `description`, and `ingredients` should be editable in both languages
    - Add `name_ar`, `description_ar`, and `ingredients_ar` columns to the `products` table (migration required)
    - Product edit form shows side-by-side or tabbed English / Arabic fields
  - Manage drivers (move existing add/remove from dashboard here)
  - Toggle product availability (mark as unavailable for today)
  - Future: manage categories, promotions, etc.

### 2. Full frontend redesign
- New theme, color palette, and typography
- New logo / brand identity
- Redesign all pages: storefront, checkout, admin, delivery driver page
- Keep layout structure but refresh visual style

### 3. Seed real products from business owner into Supabase
- Collect product list from business owner (name, description, price, category, allergens, stock)
- Write a new migration or seed script to insert into Supabase `products` table
- Replace current mock/demo products

## Backlog

## Done

### Drivers list in admin dashboard
- ~~Add a drivers section to the current admin dashboard page~~
- ~~Display all available drivers with name and phone number~~
- ~~Store drivers in Supabase `drivers` table (id, name, phone, created_at)~~
- ~~Add migration for the new table~~
- ~~Add / remove drivers from the admin UI~~
- ~~Push `drivers` migration to remote Supabase~~
