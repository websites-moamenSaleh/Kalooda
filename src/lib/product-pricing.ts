import type { Product } from "@/types/database";

export function getProductEffectivePrice(product: Product): number {
  if (typeof product.effective_price === "number" && Number.isFinite(product.effective_price)) {
    return product.effective_price;
  }
  return Number(product.price) || 0;
}
