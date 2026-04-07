import type { Product } from "@/types/database";

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
