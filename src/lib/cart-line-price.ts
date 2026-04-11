import { isSimpleConfiguration } from "@/lib/product-options/configuration-key";
import type { CartItem } from "@/types/database";
import { getProductEffectivePrice } from "@/lib/product-pricing";

/** Configured lines use frozen snapshot; simple lines follow live product effective price. */
export function lineUnitPrice(item: CartItem): number {
  const lo = item.line_options;
  if (
    lo &&
    !isSimpleConfiguration(lo.selections) &&
    typeof lo.snapshot?.unit_price === "number"
  ) {
    return lo.snapshot.unit_price;
  }
  return getProductEffectivePrice(item.product);
}
