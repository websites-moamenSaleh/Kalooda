import { normalizeCartLineOptions } from "@/lib/cart-line-options-normalize";
import { isSimpleConfiguration } from "@/lib/product-options/configuration-key";
import type { CartItem, Product } from "@/types/database";
import type { StorefrontCatalogBroadcastPayload } from "@/lib/storefront-catalog-types";

/** Payload shape from Supabase `postgres_changes` on `products`. */
export type ProductsPostgresChangePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
};

/**
 * Merge a Realtime `products` event into the storefront catalog list (sorted by name).
 */
export function mergeProductChangeIntoList(
  prev: Product[],
  payload: ProductsPostgresChangePayload
): Product[] {
  if (payload.eventType === "DELETE") {
    const id = (payload.old as { id?: string })?.id;
    if (!id) return prev;
    return prev.filter((p) => p.id !== id);
  }

  const row = payload.new as Product | null;
  if (!row?.id) return prev;

  const exists = prev.some((p) => p.id === row.id);
  if (exists) {
    return prev.map((p) => (p.id === row.id ? { ...p, ...row } : p));
  }

  return [...prev, row].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

/** Map server broadcast payload to the same shape as `postgres_changes` for shared merge logic. */
export function broadcastPayloadToPostgresShape(
  data: StorefrontCatalogBroadcastPayload
): ProductsPostgresChangePayload | null {
  if (data.action === "DELETE") {
    const id = data.id ?? data.product?.id;
    if (!id) return null;
    return { eventType: "DELETE", new: null, old: { id } };
  }
  const row = data.product;
  if (!row?.id) return null;
  return {
    eventType: data.action === "INSERT" ? "INSERT" : "UPDATE",
    new: row as unknown as Record<string, unknown>,
    old: null,
  };
}

/** Apply a `products` row change to cart line items (merge or drop if unavailable / deleted). */
export function applyProductChangeToCartItems(
  prev: CartItem[],
  payload: ProductsPostgresChangePayload
): CartItem[] {
  if (payload.eventType === "DELETE") {
    const id = (payload.old as { id?: string })?.id;
    if (!id || !prev.some((i) => i.product.id === id)) return prev;
    return prev.filter((i) => i.product.id !== id);
  }

  const row = payload.new as Product | null;
  if (!row?.id) return prev;
  const existing = prev.find((i) => i.product.id === row.id);
  if (!existing) return prev;

  const mergedProduct = { ...existing.product, ...row };
  if (mergedProduct.unavailable_today) {
    return prev.filter((i) => i.product.id !== row.id);
  }

  return prev.map((i) => {
    if (i.product.id !== row.id) return i;
    const lo = i.line_options;
    if (!lo || isSimpleConfiguration(lo.selections)) {
      return {
        ...i,
        product: mergedProduct as Product,
        line_options: normalizeCartLineOptions(lo ?? {}, mergedProduct as Product),
      };
    }
    return { ...i, product: mergedProduct as Product };
  });
}
