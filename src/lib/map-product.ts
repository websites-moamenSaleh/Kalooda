import type { Product } from "@/types/database";

/** Normalize a Supabase `products` row (snake_case, numeric fields) to `Product`. */
export function mapProductRow(row: Record<string, unknown>): Product {
  const price = row.price;
  const stock = row.stock_quantity;
  return {
    id: String(row.id),
    category_id: String(row.category_id ?? ""),
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    price: typeof price === "number" ? price : Number(price),
    stock_quantity:
      typeof stock === "number" ? stock : Math.floor(Number(stock) || 0),
    ingredients: String(row.ingredients ?? ""),
    allergens: Array.isArray(row.allergens)
      ? (row.allergens as string[])
      : [],
    image_url: String(row.image_url ?? ""),
    name_ar: row.name_ar != null ? String(row.name_ar) : null,
    description_ar:
      row.description_ar != null ? String(row.description_ar) : null,
    ingredients_ar:
      row.ingredients_ar != null ? String(row.ingredients_ar) : null,
    unavailable_today: Boolean(row.unavailable_today),
  };
}
