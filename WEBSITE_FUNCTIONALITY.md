# Kalooda — Website Functionality

This document describes what the application does from a product and technical perspective. The public-facing brand is **Kalooda** (cheesecakes and related products, online ordering with same-day delivery messaging).

---

## 1. Overview

The site is a **Next.js** storefront backed by **Supabase** (database and authentication). It supports:

- Browsing products by category, search, and bilingual content (English / Arabic).
- A shopping cart that works for guests (browser storage) and signed-in customers (synced to the server).
- Checkout that creates orders tied to the customer account.
- An **admin** area for staff to monitor orders, change order status, toggle same-day availability, and (for super admins) manage catalog data.
- A **driver-facing** page to accept a delivery using a secret link (order ID + token).
- A floating **AI chat assistant** that answers questions using live product data (OpenAI when configured, with a fallback otherwise).
- **PWA** registration so the app can be installed and use a web app manifest.

---

## 2. Technology Stack

| Layer | Choice |
|--------|--------|
| Framework | Next.js (App Router) |
| UI | React, Tailwind CSS |
| Data & auth | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| Chat | OpenAI API via `/api/chat` (optional) |
| Currency | Israeli shekel (₪) in the UI |

Separate Supabase client helpers exist for **customer** and **admin** sessions so storefront and admin flows can use different cookies/session handling.

---

## 3. Public Storefront (`/`)

### Hero and layout

- The home page shows a hero title and subtitle (translated).
- **Header**: logo, language switcher, optional **Admin** link (only if the user’s profile role is `admin` or `super_admin`, with logic that prefers the customer session so stale admin cookies do not mislabel the session), **Account** / **Sign in** / **Sign out**, and a **Cart** button with item count.
- **Cart drawer** opens from the header; it lists line items, quantities, and totals.

### Data loading

- **Categories** load from `GET /api/categories`.
- **Products** load from `GET /api/products`.

### Filtering and search

- **Category chips**: “All” or one active category; toggling a category filters the grid.
- **Search**: filters by English name/description and Arabic name/description (case-insensitive).
- Products marked **`unavailable_today`** are hidden from the grid (they do not appear in the filtered list).

### Product cards

- Each card shows localized name and description, optional **allergen** badges, price in ₪, and an **add to cart** action.
- Visuals use emoji placeholders keyed by product ID (with a default cake emoji).

### Chatbot

- A fixed **chat bubble** opens a panel that talks to `POST /api/chat`.
- The server loads **available** products from the database and builds a system prompt so the assistant can answer ingredient/allergen questions without inventing items. If `OPENAI_API_KEY` is missing or placeholder, a **fallback** path still returns helpful canned-style replies using that product list.

---

## 4. Shopping Cart

Behavior is implemented in `CartProvider` (`src/contexts/cart-context.tsx`):

- **Guests**: cart lines are stored in **localStorage** under a fixed key (`GUEST_CART_KEY`).
- **Signed-in customers**: after auth is ready, the cart is **hydrated** from the server and changes are **debounced** and synced with `PUT /api/cart`.
- Operations: add item, remove line, update quantity, clear local cart, **clear remote cart** (used after a successful order).

The cart exposes `cartReady` so checkout can wait until server sync/hydration has finished where applicable.

---

## 5. Authentication (Customers)

- **Sign in** (`/sign-in`) and **sign up** (`/sign-up`) use Supabase (email/password and optional OAuth such as Google, per `AuthProvider`).
- **Auth callback** routes under `/auth/callback` handle OAuth returns for customer vs admin.
- **Sign out** clears the customer session (`/auth/sign-out` route).
- Profile data lives in the **`profiles`** table (`full_name`, `phone`, `role`, etc.). The app uses **`/api/auth/customer-session`** as a fallback when resolving the session from the client.

### Auth error page

- `/auth-error` surfaces failed or cancelled authentication flows.

---

## 6. Checkout (`/checkout`)

- Requires a **non-empty cart** and (for submission) a **signed-in** user; otherwise the API returns **401** and the UI redirects to sign-in with `next=/checkout`.
- **Order summary** lists line items and total in ₪.
- **Contact for delivery**:
  - If the profile already has **full name and phone**, those are shown read-only with a link to edit on `/account`.
  - Otherwise the user must enter name and phone on the form (and is encouraged to save a complete profile).
- **POST `/api/orders`** creates the order with line items (product id, snapshot name, quantity, unit price) and total. On success:
  - Remote cart is cleared and local cart is cleared.
  - Profile is refreshed.
  - A confirmation screen shows the **display order id** and a link to **My orders**.

Handled error cases include **profile incomplete**, **schema outdated** (503 with a specific code), and generic failures (alerts with server messages when present).

---

## 7. Customer Account

### Profile (`/account`)

- Edit **full name** and **phone**; **email** is read-only.
- Saves go directly to Supabase `profiles` for the current user, then refresh profile state.

### Order history (`/account/orders`)

- **GET `/api/orders/mine`** returns the signed-in user’s orders.
- Each row shows **display id**, **created** timestamp, **status** (translated), and **total** in ₪.

Sub-navigation between profile and orders is shared via `AccountSubnav`.

---

## 8. Admin Area (`/admin`)

### Access and layout

- Admin routes use **`AdminAuthProvider`** and a dedicated sign-in at **`/admin/sign-in`**.
- Non–sign-in admin pages use a layout with logo, language switcher, sign out, and tabs:
  - **Dashboard** — `/admin`
  - **Functions** — `/admin/functions` — visible only if `profile.role === "super_admin"`.

### Dashboard (`/admin`)

- Fetches **orders**, **products**, and **drivers** from APIs.
- **Realtime**: subscribes to Postgres changes on the **`orders`** table and merges updates into local state (with a short “flash” highlight on changed rows).
- **Stats**: counts of orders in each status — `pending`, `preparing`, `out_for_delivery`.
- **Orders table**: order id, customer name, line items summary, total, status badge, and a **dropdown** to PATCH status via **`/api/orders/[orderId]/status`**.
- **Product availability**: toggles **`unavailable_today`** per product via **`PATCH /api/products/[id]/availability`** (optimistic UI with rollback on error).
- **Drivers**: read-only table (name, phone) for reference.

### Functions page (`/admin/functions`) — super admin only

Full CRUD-style operations for operations data:

- **Products**: create, edit (bilingual EN/AR tabs for name, description, ingredients), price, stock, allergens (comma-separated → array), image URL, category; delete; toggle same-day availability.
- **Categories**: add (English + optional Arabic name), delete.
- **Orders**: list with status; **delete** order (destructive; admin API).
- **Drivers**: add (name + optional phone), remove.

All of this goes through the corresponding **`/api/products`**, **`/api/categories`**, **`/api/orders`**, **`/api/drivers`** routes with appropriate methods.

---

## 9. Delivery Acceptance (`/delivery/accept/[orderId]`)

- Intended for **drivers** who receive a link containing **`orderId`** and a **`token`** query parameter (the order’s `delivery_token`).
- **GET `/api/orders/[orderId]?token=...`** loads order details if the token is valid.
- If status is **`pending`**, the driver can enter their name and **accept**, which **PATCH**es status to **`preparing`** via **`/api/orders/[orderId]/status?token=...`**.
- If already **`preparing`**, the UI shows an “already accepted” style success state.
- Invalid token, wrong state, or missing order shows an error state.
- Minimal chrome: logo, language switcher, and the acceptance card.

---

## 10. Internationalization (i18n)

- **Locale** is stored in a cookie (see `LOCALE_COOKIE_NAME` / `parseLocaleCookie`).
- The **root layout** sets `lang` and **`dir`** (`ltr` vs `rtl` for Arabic).
- **`LanguageProvider`** + **`translations.ts`** drive all user-visible strings; **`LanguageSwitcher`** updates preference.
- Product and category **Arabic** fields (`name_ar`, `description_ar`, etc.) are used when locale is Arabic.

---

## 11. Progressive Web App (PWA)

- **`metadata.manifest`** points to `/manifest.json`.
- **`PWARegister`** registers a service worker (`public/sw.js`) so the app can be installed and cached according to that worker’s rules.

---

## 12. Order Lifecycle (Summary)

| Status | Typical meaning |
|--------|------------------|
| `pending` | Order placed; awaiting kitchen or assignment. |
| `preparing` | Being prepared; driver acceptance also moves an order here from `pending`. |
| `out_for_delivery` | On the way to the customer. |

Customer order history and admin UI both use these three statuses.

---

## 13. API Surface (Quick Reference)

| Method | Path | Role / notes |
|--------|------|----------------|
| GET | `/api/categories` | Public catalog |
| POST/DELETE | `/api/categories` | Admin (create/delete) |
| GET | `/api/products` | Public list |
| POST/PUT/DELETE | `/api/products` | Admin CRUD |
| PATCH | `/api/products/[id]/availability` | Toggle `unavailable_today` |
| GET | `/api/orders` | Admin list |
| POST | `/api/orders` | Authenticated customer checkout |
| GET | `/api/orders/mine` | Customer’s orders |
| GET | `/api/orders/[orderId]` | Order by id + `token` for delivery page |
| PATCH | `/api/orders/[orderId]/status` | Admin session or `token` for driver accept |
| DELETE | `/api/orders/[orderId]` | Admin delete order |
| PUT | `/api/cart` | Sync signed-in cart |
| GET | `/api/drivers` | Admin |
| POST/DELETE | `/api/drivers` | Admin |
| POST | `/api/chat` | Chat messages → assistant reply |
| GET | `/api/auth/customer-session` | Session probe for customer |

*(Exact authorization is enforced in each route handler and Supabase RLS policies; this table reflects how the app calls the API.)*

---

## 14. Core Data Concepts

- **Category**: id, names (EN/AR), slug, image.
- **Product**: category, bilingual text fields, price, stock, allergens array, image URL, **`unavailable_today`** flag.
- **Order**: internal id, human **`display_id`**, optional `user_id`, customer name/phone, JSON **`items`**, **`total_price`**, **`status`**, **`delivery_token`** for secure driver links.
- **Driver**: name, phone (directory for operations).
- **Profile**: linked to auth user; **`role`** distinguishes customers from `admin` / `super_admin`.

---

This file is meant to stay aligned with the codebase. If you add flows (payments, addresses, push notifications, etc.), update this document in the same change.
