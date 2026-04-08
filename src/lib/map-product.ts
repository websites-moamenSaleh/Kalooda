import type { Product } from "@/types/database";

/** Normalize a Supabase `products` row (snake_case, numeric fields) to `Product`. */
export function mapProductRow(row: Record<string, unknown>): Product {
  const price = row.price;
  const basePriceRaw = row.base_price;
  const effectivePriceRaw = row.effective_price;
  return {
    id: String(row.id),
    category_id: String(row.category_id ?? ""),
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    price: typeof price === "number" ? price : Number(price),
    ingredients: String(row.ingredients ?? ""),
    allergens: Array.isArray(row.allergens)
      ? (row.allergens as string[])
      : [],
    allergens_ar: Array.isArray(row.allergens_ar)
      ? (row.allergens_ar as string[])
      : null,
    image_url: String(row.image_url ?? ""),
    name_ar: row.name_ar != null ? String(row.name_ar) : null,
    description_ar:
      row.description_ar != null ? String(row.description_ar) : null,
    ingredients_ar:
      row.ingredients_ar != null ? String(row.ingredients_ar) : null,
    unavailable_today: Boolean(row.unavailable_today),
    base_price:
      basePriceRaw == null
        ? undefined
        : typeof basePriceRaw === "number"
          ? basePriceRaw
          : Number(basePriceRaw),
    effective_price:
      effectivePriceRaw == null
        ? undefined
        : typeof effectivePriceRaw === "number"
          ? effectivePriceRaw
          : Number(effectivePriceRaw),
    active_sale:
      row.active_sale && typeof row.active_sale === "object"
        ? (row.active_sale as Product["active_sale"])
        : null,
  };
}
