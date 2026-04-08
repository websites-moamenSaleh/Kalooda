import { supabaseAdmin } from "@/lib/supabase-server";
import type { Product } from "@/types/database";

export type DiscountType = "amount" | "percentage";

type SaleProductRow = {
  sale_id: string;
  product_id: string;
  override_value: number | null;
  override_type: DiscountType | null;
};

export function computeDiscountedPrice(
  basePrice: number,
  discountValue: number,
  discountType: DiscountType
): number {
  if (!Number.isFinite(basePrice) || basePrice < 0) return 0;
  if (!Number.isFinite(discountValue) || discountValue <= 0) return roundPrice(basePrice);

  if (discountType === "percentage") {
    const clamped = Math.max(0, Math.min(100, discountValue));
    return roundPrice(Math.max(0, basePrice - (basePrice * clamped) / 100));
  }

  return roundPrice(Math.max(0, basePrice - discountValue));
}

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function getActiveSalePricingByProductIds(
  productIds: string[],
  atIso: string = new Date().toISOString()
): Promise<
  Map<
    string,
    {
      sale_id: string;
      sale_name: string;
      discount_type: DiscountType;
      discount_value: number;
      start_at: string;
      end_at: string;
    }
  >
> {
  const ids = [...new Set(productIds.filter(Boolean))];
  if (ids.length === 0) return new Map();

  const { data: activeSales, error: salesError } = await supabaseAdmin
    .from("sales")
    .select("id, name, start_at, end_at, default_value, default_type")
    .is("ended_at", null)
    .lte("start_at", atIso)
    .gt("end_at", atIso);
  if (salesError) {
    // If migrations are not yet applied, gracefully fallback to base pricing.
    return new Map();
  }
  const saleById = new Map((activeSales ?? []).map((sale) => [sale.id, sale]));
  if (saleById.size === 0) return new Map();

  const { data, error } = await supabaseAdmin
    .from("sale_products")
    .select("product_id, override_value, override_type, sale_id")
    .in("product_id", ids)
    .in("sale_id", [...saleById.keys()]);
  if (error) return new Map();

  const byProduct = new Map<
    string,
    {
      sale_id: string;
      sale_name: string;
      discount_type: DiscountType;
      discount_value: number;
      start_at: string;
      end_at: string;
    }
  >();

  for (const row of (data ?? []) as unknown as Array<SaleProductRow & { sale_id: string }>) {
    const sale = saleById.get(row.sale_id);
    if (!sale) continue;
    const type = row.override_type ?? sale.default_type;
    const value = row.override_value ?? sale.default_value;
    byProduct.set(row.product_id, {
      sale_id: sale.id,
      sale_name: sale.name,
      discount_type: type,
      discount_value: Number(value),
      start_at: sale.start_at,
      end_at: sale.end_at,
    });
  }

  return byProduct;
}

export async function applyEffectivePricing<T extends { id: string; price: number }>(
  products: T[]
): Promise<Array<T & Pick<Product, "base_price" | "effective_price" | "active_sale">>> {
  const pricingMap = await getActiveSalePricingByProductIds(products.map((p) => p.id));
  return products.map((product) => {
    const sale = pricingMap.get(product.id);
    const basePrice = Number(product.price) || 0;
    const effective = sale
      ? computeDiscountedPrice(basePrice, sale.discount_value, sale.discount_type)
      : roundPrice(basePrice);
    return {
      ...product,
      base_price: roundPrice(basePrice),
      effective_price: effective,
      active_sale: sale
        ? {
            id: sale.sale_id,
            name: sale.sale_name,
            start_at: sale.start_at,
            end_at: sale.end_at,
            discount_type: sale.discount_type,
            discount_value: sale.discount_value,
          }
        : null,
    };
  });
}
