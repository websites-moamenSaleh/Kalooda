import type { Product } from "@/types/database";

/** Number of product cards shown in the Top sellers homepage section. */
export const CHEF_SELECTIONS_COUNT = 5;

/**
 * Returns up to {@link CHEF_SELECTIONS_COUNT} products for the Top sellers block,
 * ordered as the current storefront "best sellers."
 *
 * **Temporary fallback (no sales aggregate yet):** The public catalog API does not expose
 * order-line totals or per-product sales counts. Until that data is available (e.g. from
 * fulfilled orders aggregated server-side), this function uses a deterministic placeholder
 * ranking so the UI always has a stable ordering. Replace only the **sorting/ranking step**
 * inside this function with descending units sold (then tie-break by `id`) once real
 * metrics exist. Call sites and JSX should stay unchanged.
 *
 * **Future:** Real best-seller ranking should come from sales/order data (or a derived
 * table/endpoint). The storefront should consume ranked ids or pre-ordered products;
 * this module remains the single place for selection logic.
 */
export function selectTopBestSellerProducts(
  availableProducts: Product[]
): Product[] {
  const sorted = [...availableProducts].sort((a, b) => {
    // Temporary fallback ranking — replace with sales-based order when data exists.
    const byName = a.name.localeCompare(b.name, undefined, {
      sensitivity: "base",
    });
    if (byName !== 0) return byName;
    return a.id.localeCompare(b.id);
  });
  return sorted.slice(0, CHEF_SELECTIONS_COUNT);
}

/**
 * Products in one catalog category (Menu section).
 * Available items first; unavailable (`unavailable_today`) last, with stable name order within each group.
 */
export function getProductsForMenuCategory(
  products: Product[],
  categoryId: string | null
): Product[] {
  if (!categoryId) return [];
  const inCategory = products.filter((p) => p.category_id === categoryId);
  return [...inCategory].sort((a, b) => {
    const aUn = a.unavailable_today ? 1 : 0;
    const bUn = b.unavailable_today ? 1 : 0;
    if (aUn !== bUn) return aUn - bUn;
    const byName = a.name.localeCompare(b.name, undefined, {
      sensitivity: "base",
    });
    if (byName !== 0) return byName;
    return a.id.localeCompare(b.id);
  });
}
