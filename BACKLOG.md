# SweetDrop — Backlog

## In Progress

## Up Next

### 1. Full frontend redesign
- New theme, color palette, and typography
- New logo / brand identity
- Redesign all pages: storefront, checkout, admin, delivery driver page
- Keep layout structure but refresh visual style

### 2. Customer order history page
- Customer can view current (active) and past (completed) orders
- Show relevant order details: order number, date, items, quantities, total price, and status
- Distinguish between active orders (e.g. pending, preparing, out for delivery) and past orders (delivered, cancelled)
- Accessible from the customer-facing side (e.g. via a "My Orders" link)

---

### 3. Authentication & authorization

**Description**
Implement sign-up and sign-in flows for all user types (Customer, Admin, Super Admin) using Supabase Auth. After authentication the system must persist and recognize each user's role so that downstream features (route protection, UI gating) can rely on it.

**Technical notes**
- Use **Supabase Auth** (`@supabase/ssr` with cookie-based sessions) for sign-up, sign-in, sign-out, and session management.
- Create a `profiles` table in Supabase with at least: `id (uuid, FK → auth.users.id)`, `role (text, one of 'customer' | 'admin' | 'super_admin')`, `full_name`, `phone`, `created_at`.
- Write a Supabase database trigger (`on_auth_user_created`) that auto-inserts a `profiles` row with `role = 'customer'` for every new sign-up (default role).
- Admin and Super Admin roles are assigned manually (or via a Super Admin UI in a later story) — never self-assigned during sign-up.
- Replace the current `supabase-client.ts` (anon-only) with `createBrowserClient` from `@supabase/ssr`; replace `supabase-server.ts` with `createServerClient` that reads/writes cookies.
- Add an `AuthProvider` context (`src/contexts/auth-context.tsx`) that exposes `user`, `profile` (with role), `signIn`, `signUp`, `signOut`, and `loading` state.
- Build `/sign-in` and `/sign-up` pages with email + password (minimum); support adding name and phone during sign-up.
- After sign-in, redirect users based on role: customers → `/`, admins/super admins → `/admin`.
- Enable Supabase RLS on `profiles` — users can read their own profile; service role can read/write all.

**Acceptance criteria**
- [ ] A new user can sign up with email, password, name, and phone; a `profiles` row with `role = 'customer'` is created automatically.
- [ ] A user can sign in with email and password and is redirected to the correct landing page based on role.
- [ ] A user can sign out; session cookies are cleared and they are redirected to `/sign-in`.
- [ ] The `AuthProvider` context provides the current user and their role to all client components.
- [ ] Server-side utilities (`createServerClient`) can read the session from cookies in Server Components and API routes.
- [ ] The `profiles` table has RLS enabled; users can only read their own row via the anon/authenticated key.
- [ ] Admin and Super Admin roles cannot be self-assigned through the sign-up flow.
- [ ] Sign-in and sign-up pages are visually consistent with the existing app design and support both English and Arabic.

**Dependencies**
- None (foundational — all role-based features depend on this).

---

### 4. Role-based page separation & access control

**Description**
Enforce strict route protection so that customers can only access customer pages, admins can only access admin pages, and super admins can access both admin pages and admin-functions pages. Unauthorized or unauthenticated users must be blocked from restricted routes, including direct URL access.

**Technical notes**
- Add a Next.js **middleware** (`src/middleware.ts`) that runs on every request:
  - Read the Supabase session from cookies.
  - Define route groups:
    - **Public**: `/sign-in`, `/sign-up`, `/` (storefront), `/checkout`, `/delivery/accept/*`.
    - **Auth-required (customer)**: `/orders` (future order-history page), any future customer-only routes.
    - **Admin**: `/admin` — requires `role = 'admin'` or `role = 'super_admin'`.
    - **Super Admin**: `/admin/functions` — requires `role = 'super_admin'`.
  - Unauthenticated users hitting a protected route → redirect to `/sign-in`.
  - Authenticated users without the required role → redirect to their role-appropriate home (`/` for customers, `/admin` for admins).
- In the **admin layout** (`src/app/admin/layout.tsx`), add a server-side session + role check as a second layer of defense; render a 403 or redirect if the role doesn't match.
- Protect **API routes** (`src/app/api/*`): admin-only endpoints (drivers CRUD, product mutations, order-status updates) must verify the caller's session and role before executing. Return `401` for unauthenticated and `403` for unauthorized requests.
- Hide navigation links that the user's role cannot access (e.g., customers never see an "Admin" link; admins don't see the "Functions" tab unless they are super admins).
- Ensure the `/admin/functions` tab in the admin nav is only visible and accessible to super admins.

**Acceptance criteria**
- [ ] Unauthenticated users cannot access `/admin`, `/admin/functions`, or any auth-required customer page; they are redirected to `/sign-in`.
- [ ] Authenticated customers accessing `/admin` or `/admin/functions` via direct URL are redirected to `/`.
- [ ] Authenticated admins can access `/admin` but are redirected away from `/admin/functions`.
- [ ] Authenticated super admins can access both `/admin` and `/admin/functions`.
- [ ] Admin API routes return `401` when called without a valid session and `403` when called by a user without the required role.
- [ ] The admin layout "Functions" tab is only visible to super admins.
- [ ] Customers see no admin navigation links anywhere in the customer UI.
- [ ] Middleware correctly handles edge cases: expired sessions, missing profiles, unknown roles.
- [ ] All redirects preserve the current locale / language setting.

**Dependencies**
- Story 3 (Authentication & authorization) must be completed first.

## Done

### Seed real products from business owner into Supabase
- ~~Collected product list from business owner (4 products, 3 categories, bilingual)~~
- ~~Migration `20260330100000_seed_real_products.sql` replaces demo data with real products~~
- ~~Pushed migration to remote Supabase~~

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
