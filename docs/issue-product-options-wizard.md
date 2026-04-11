# Feature: Reusable Product Options and Sequential Selection Wizard

## Summary

Implement a reusable **product options** system for Kalooda Sweets: Super-Admins manage global **Options** and **Choices**, attach them to products with per-product overrides, and customers configure products through a **sequential wizard** before add-to-cart.

## Stack

- Next.js **16.2.1** (App Router)
- React **19.2.4**
- Supabase (PostgreSQL)
- Tailwind CSS **4**

## Goals

1. **Reuse** one option definition (e.g. “Toppings”) across many products.
2. **Per-product** rules: sort order, min/max, free items, must-select, conditional visibility, display/POS overrides.
3. **Storefront**: multi-step modal wizard with validation and live price updates.
4. **Cart & orders**: selections and final line pricing persist correctly (guest + authenticated cart, `orders` / line items).

## 1. Database (Supabase / PostgreSQL)

Add tables, enums, RLS, and indexes via a new migration under `supabase/migrations/`.

### `options`


| Column            | Type        | Notes                                                                 |
| ----------------- | ----------- | --------------------------------------------------------------------- |
| `id`              | `uuid` PK   |                                                                       |
| `type`            | `enum`      | `single`                                                              |
| `title_en`        | `text`      | Match existing bilingual column conventions on `products` if possible |
| `title_ar`        | `text`      |                                                                       |
| `show_to_courier` | `boolean`   | Default `false`                                                       |
| `pos_id`          | `text` null | External POS identifier                                               |


### `option_choices`


| Column           | Type           | Notes                                                        |
| ---------------- | -------------- | ------------------------------------------------------------ |
| `id`             | `uuid` PK      |                                                              |
| `option_id`      | `uuid` FK      | → `options`, `ON DELETE CASCADE`                             |
| `name_en`        | `text`         |                                                              |
| `name_ar`        | `text`         |                                                              |
| `price_markup`   | `numeric`      | Applied when selected                                        |
| `vat_percentage` | `numeric` null | If null, inherit product/store rules (document in migration) |
| `pos_id`         | `text` null    |                                                              |
| `is_default`     | `boolean`      |                                                              |
| `is_enabled`     | `boolean`      |                                                              |


### `product_options_junction`


| Column               | Type         | Notes                                            |
| -------------------- | ------------ | ------------------------------------------------ |
| `product_id`         | `uuid` FK    | → `products`                                     |
| `option_id`          | `uuid` FK    | → `options`                                      |
| **PK**               | composite    | `(product_id, option_id)`                        |
| `sort_order`         | `int`        | Wizard sequence + admin ordering                 |
| `min_select`         | `int`        | Align with `options.type` (single → typically 1) |
| `max_select`         | `int`        |                                                  |
| `items_free`         | `int`        | e.g. first N choices free                        |
| `must_select_count`  | `int`        | Cannot proceed until satisfied                   |
| `hidden_conditional` | `jsonb` null | See **Hidden conditional (v1)** below            |
| `display_name_en`    | `text` null  | “Option name in app” override per product        |
| `display_name_ar`    | `text` null  |                                                  |
| `pos_id`             | `text` null  | POS override for this product–option link        |


### Realtime

Enable **Supabase Realtime** on `options`, `option_choices`, and `product_options_junction` using the same publication pattern as `products`, so Super-Admin changes (e.g. disabling a choice, out-of-stock) **update an open wizard without a full page refresh**. Cart lines already added must still follow **price snapshotting** (below)—Realtime affects in-progress UI, not committed line totals.

## 2. Admin UI (Next.js)

- **Options Library** (global manager): CRUD for `options` and nested `option_choices`; list/filter; toggle `is_enabled`; set defaults where allowed.
- **Product edit flow**: add an **Options** tab (reference UI: *9 Mini Personal Cakes* screenshot). Attach/detach options, edit junction overrides (`display_name_*`, `pos_id`, `sort_order`, selection rules).
- **Drag-and-drop** reorder of options **per product** (persist `sort_order`).
- **Super-Admin only** (reuse existing role checks / admin layout patterns).

## 3. Customer UI (storefront)

- If a product has linked options, replace immediate **Add to cart** with **Configure** (opens wizard).
- **Sequential wizard** (one option per step, ordered by `sort_order`):
  - Step 1 → **Next**
  - Middle steps → **Back** / **Next**
  - Last step → **Back** / **Add to cart**
- **Skip / visibility**: respect `hidden_conditional` so steps that do not apply are **skipped** (see below).
- **Validation**: cannot use **Next** or **Add to cart** until the current step satisfies `min_select` / `max_select` / `must_select_count` / `items_free` for that junction. Use **Zod 4** schemas for wizard step validation; **mirror or share** the same rules on the server for cart and order APIs so rules cannot be bypassed from the client.
- **Pricing**: show running total; add `price_markup` (and VAT rules) for selected choices; final line `unit_price` must match **server-side** validation/recomputation from DB where appropriate.

## 4. State management & data flow

- Dedicated **React context + `useReducer`** (or a small state machine) for: current step index, selections per `option_id`, derived visible steps (from `hidden_conditional`), and computed price breakdown.
- **Cart**: extend `CartItem` (and persisted cart / guest `localStorage` shape) to include structured selections **and** a **snapshot** of choice display names and monetary amounts at add time (see **Price snapshotting**).
- **Checkout**: extend the order payload (`order-create-body` / API) so each line item carries selections and a **validated** `unit_price`; server should enforce consistency with snapshots or authoritative recompute policy documented in the PR.

## Hidden conditional (v1)

Use a simple **if-then** JSON shape. Example:

```json
{ "show_if": { "option_id": "<uuid>", "choice_id": "<uuid>" } }
```

**Semantics:** show this product-option step only if that **choice** is selected for that **option** (e.g. show “Milk options” only after “Coffee” was chosen on a prior step). Defer richer boolean composition (`all_of` / `any_of`) to a follow-up unless product requirements force it in v1.

## Price snapshotting (integrity)

When a customer adds a configured product to the cart, the cart line **must** store a **snapshot** of:

- Selected choice **display names** (EN/AR as needed for receipts/UI), and  
- **Prices used at add time** (markup and VAT treatment applied to that line).

Committed order totals must **not** shift if a Super-Admin later changes `price_markup` or choice rows in the database. Realtime updates apply to **in-progress** wizards; lines already in the cart rely on the snapshot.

## Acceptance criteria

- One **Option** can be linked to **at least five** products without duplicating choice rows.
- Wizard **cannot skip** a step that still violates **must-select** / min-max rules for that option.
- **Configure → Add to cart** stores selections **and price/name snapshots** in cart state; **checkout** persists them on the order and they remain stable if catalog prices change later.
- **Super-Admins** can manage the library and product attachments; customers only see enabled choices and applicable options (including Realtime-driven disablement on open wizards).

## Suggested file layout

### `src/components`


| Path                                                                                | Purpose                      |
| ----------------------------------------------------------------------------------- | ---------------------------- |
| `src/components/admin/options/options-library-screen.tsx`                           | Options Library main UI      |
| `src/components/admin/options/option-editor-dialog.tsx`                             | Create/edit option + choices |
| `src/components/admin/options/option-choice-row.tsx`                                | Single choice row            |
| `src/components/admin/products/product-options-tab.tsx`                             | Product modal Options tab (DnD + draft/save in one file) |
| `src/components/storefront/product-options-wizard/product-options-wizard-modal.tsx` | Storefront modal: product hero + options wizard + add-to-cart (`ProductStorefrontModal`) |
| `src/components/product-card.tsx`                                                   | Opens modal; passes `flySourceRef` for fly-to-cart        |


### `src/lib`


| Path                                             | Purpose                                           |
| ------------------------------------------------ | ------------------------------------------------- |
| `src/lib/product-options/types.ts`               | Shared TS types                                   |
| `src/lib/product-options/queries.ts`             | Supabase fetch shapes                             |
| `src/lib/product-options/visibility.ts`          | Evaluate `hidden_conditional`                     |
| `src/lib/product-options/validate-selections.ts` | Min/max, must-select; Zod 4                       |
| `src/lib/product-options/pricing.ts`             | Markup + VAT; align with existing pricing helpers |
| `src/lib/load-product-options-bundle.ts`         | Load junction/options/choices (single product or batched for orders) |


### `src/contexts`

Wizard state lives in `product-options-wizard-modal.tsx` (local reducer). No separate wizard context module.


### API routes (illustrative)


| Path                                               | Purpose                    |
| -------------------------------------------------- | -------------------------- |
| `src/app/api/admin/options/route.ts`               | List/create                |
| `src/app/api/admin/options/[id]/route.ts`          | Patch/delete + choices     |
| `src/app/api/admin/products/[id]/options/route.ts` | Junction CRUD + reorder    |
| `src/app/api/products/[id]/options/route.ts`       | Public read for storefront |


### Repo touchpoints

- `src/types/database.ts` — types for new tables; extend `CartItem`, `OrderItem`
- `src/app/admin/functions/page.tsx` — product admin (integrate Options tab; consider extracting components)
- `src/contexts/cart-context.tsx`, `src/app/api/cart/route.ts` — cart shape + API
- `src/lib/order-create-body.ts` — order line schema + snapshots

## Open decisions (non-blocking)

- **Bilingual storage**: strict `*_en` / `*_ar` columns vs JSONB—match `products`.
- `**vat_percentage` null**: document inheritance from product or store defaults in migration comments.

