# SweetDrop — Backlog

## In Progress

## Up Next

### 1. Seed real drivers into Supabase
- Insert real driver data into the `drivers` table

### 3. Full frontend redesign
- New theme, color palette, and typography
- New logo / brand identity
- Redesign all pages: storefront, checkout, admin, delivery driver page
- Keep layout structure but refresh visual style

### 2. Seed real products from business owner into Supabase
- Collect product list from business owner (name, description, price, category, allergens, stock)
- Write a new migration or seed script to insert into Supabase `products` table
- Replace current mock/demo products

## Backlog

## Done

### Split admin into two pages
- ~~**Dashboard** (`/admin`) — order management + product availability toggles~~
- ~~**Functions** (`/admin/functions`) — super admin panel with:~~
  - ~~Add / edit / remove products with bilingual support (English & Arabic)~~
  - ~~Tabbed English / Arabic fields for `name`, `description`, `ingredients`~~
  - ~~Migration: added `name_ar`, `description_ar`, `ingredients_ar`, `unavailable_today` columns~~
  - ~~Manage drivers (moved from dashboard)~~
  - ~~Toggle product availability (mark as unavailable for today)~~
- ~~Shared admin layout with Dashboard / Functions tab navigation~~
- ~~Storefront uses Arabic fields when locale is `ar`, filters out unavailable products~~
- ~~Pushed migration to remote Supabase~~

### Drivers list in admin dashboard
- ~~Add a drivers section to the current admin dashboard page~~
- ~~Display all available drivers with name and phone number~~
- ~~Store drivers in Supabase `drivers` table (id, name, phone, created_at)~~
- ~~Add migration for the new table~~
- ~~Add / remove drivers from the admin UI~~
- ~~Push `drivers` migration to remote Supabase~~
