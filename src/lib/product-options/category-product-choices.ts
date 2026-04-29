import { supabaseAdmin } from "@/lib/supabase-server";
import type {
  CatalogOptionRow,
  OptionChoiceRow,
} from "@/lib/product-options/types";

type CategoryProductChoiceRow = {
  id: string;
  category_id: string | null;
  name: string;
  name_ar: string | null;
};

export function isCategoryProductOption(option: CatalogOptionRow): boolean {
  return (
    option.choice_source === "category_products" &&
    Boolean(option.source_category_id)
  );
}

export async function loadCategoryProductChoicesForOptions(
  options: CatalogOptionRow[]
): Promise<OptionChoiceRow[]> {
  const categoryOptions = options.filter(isCategoryProductOption);
  const categoryIds = [
    ...new Set(categoryOptions.map((option) => option.source_category_id as string)),
  ];

  if (categoryIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, category_id, name, name_ar")
    .in("category_id", categoryIds)
    .eq("unavailable_today", false)
    .order("name", { ascending: true });

  if (error) {
    console.error("loadCategoryProductChoicesForOptions products", error);
    return [];
  }

  const productsByCategory = new Map<string, CategoryProductChoiceRow[]>();
  for (const product of (data ?? []) as CategoryProductChoiceRow[]) {
    if (!product.category_id) continue;
    const list = productsByCategory.get(product.category_id) ?? [];
    list.push(product);
    productsByCategory.set(product.category_id, list);
  }

  const choices: OptionChoiceRow[] = [];
  for (const option of categoryOptions) {
    const products = productsByCategory.get(option.source_category_id as string) ?? [];
    products.forEach((product, index) => {
      choices.push({
        id: product.id,
        option_id: option.id,
        name_en: product.name,
        name_ar: product.name_ar,
        price_markup: 0,
        vat_percentage: null,
        pos_id: null,
        is_default: false,
        is_enabled: true,
        sort_order: index,
      });
    });
  }

  return choices;
}
