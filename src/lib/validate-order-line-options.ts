import {
  loadProductOptionsBundleByProductId,
} from "@/lib/load-product-options-bundle";
import {
  computeDiscountedPrice,
  type DiscountType,
} from "@/lib/sale-pricing";
import { isSimpleConfiguration } from "@/lib/product-options/configuration-key";
import { computeOptionsPricing } from "@/lib/product-options/pricing";
import { validateAllVisibleSteps } from "@/lib/product-options/validate-selections";
import type {
  CartLineOptionsPersisted,
  ProductOptionsBundle,
} from "@/lib/product-options/types";

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

type SaleInfo = {
  discount_type: DiscountType;
  discount_value: number;
};

export type ValidatedOrderLine = {
  product_id: string;
  product_name: string;
  product_name_ar: string | null;
  quantity: number;
  unit_price: number;
  image_url: string | null;
  line_options: CartLineOptionsPersisted | null;
};

export async function validateAndBuildOrderLine(
  item: {
    product_id: string;
    product_name: string;
    product_name_ar?: string | null;
    quantity: number;
    unit_price: number;
    image_url?: string | null;
    line_options?: CartLineOptionsPersisted | null;
  },
  productRow: {
    name: string;
    name_ar: string | null;
    price: number;
    image_url?: string | null;
  },
  sale: SaleInfo | undefined,
  /** When omitted, the bundle is loaded for this product only. */
  prefetchedBundle?: ProductOptionsBundle
): Promise<ValidatedOrderLine> {
  const basePrice = Number(productRow.price) || 0;
  const baseEffective = sale
    ? computeDiscountedPrice(
        basePrice,
        sale.discount_value,
        sale.discount_type
      )
    : roundPrice(basePrice);

  const bundle =
    prefetchedBundle ??
    (await loadProductOptionsBundleByProductId(item.product_id));

  if (bundle.junctions.length === 0) {
    const lo = item.line_options;
    if (lo && !isSimpleConfiguration(lo.selections)) {
      const err = new Error("Options not allowed for this product");
      (err as Error & { code: string }).code = "OPTIONS_NOT_ALLOWED";
      throw err;
    }
    if (
      lo &&
      isSimpleConfiguration(lo.selections) &&
      typeof lo.snapshot?.unit_price === "number" &&
      Math.abs(lo.snapshot.unit_price - baseEffective) > 0.05
    ) {
      const err = new Error("Simple line price mismatch");
      (err as Error & { code: string }).code = "PRICE_MISMATCH";
      throw err;
    }
    return {
      product_id: item.product_id,
      product_name: String(productRow.name ?? item.product_name),
      product_name_ar: productRow.name_ar ? String(productRow.name_ar) : null,
      quantity: item.quantity,
      unit_price: baseEffective,
      image_url: productRow.image_url ?? item.image_url ?? null,
      line_options: null,
    };
  }

  const lo = item.line_options;
  if (!lo) {
    const err = new Error("Configured product requires options");
    (err as Error & { code: string }).code = "OPTIONS_REQUIRED";
    throw err;
  }

  const v = validateAllVisibleSteps(bundle, lo.selections);
  if (!v.ok) {
    const err = new Error("Invalid option selections");
    (err as Error & { code: string }).code = "OPTIONS_INVALID";
    throw err;
  }

  const pricing = computeOptionsPricing(bundle, lo.selections, baseEffective);
  if (Math.abs(pricing.unit_price - lo.snapshot.unit_price) > 0.05) {
    const err = new Error("Option price mismatch");
    (err as Error & { code: string }).code = "PRICE_MISMATCH";
    throw err;
  }

  return {
    product_id: item.product_id,
    product_name: String(productRow.name ?? item.product_name),
    product_name_ar: productRow.name_ar ? String(productRow.name_ar) : null,
    quantity: item.quantity,
    unit_price: pricing.unit_price,
    image_url: productRow.image_url ?? item.image_url ?? null,
    line_options: {
      selections: lo.selections,
      snapshot: {
        choice_lines: pricing.choice_lines,
        options_subtotal: pricing.options_subtotal,
        unit_price: pricing.unit_price,
      },
    },
  };
}
