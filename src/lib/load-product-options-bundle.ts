import { supabaseAdmin } from "@/lib/supabase-server";
import { bundleForProductRows } from "@/lib/product-options/pricing";
import { loadCategoryProductChoicesForOptions } from "@/lib/product-options/category-product-choices";
import type {
  CatalogOptionRow,
  OptionChoiceRow,
  ProductOptionJunctionRow,
  ProductOptionsBundle,
} from "@/lib/product-options/types";

function emptyBundle(): ProductOptionsBundle {
  return {
    junctions: [],
    optionsById: new Map(),
    choicesByOptionId: new Map(),
  };
}

/**
 * Load option bundles for many products in a small number of queries (junctions → options → choices).
 * Each product id maps to a bundle; products with no junctions get an empty bundle.
 */
export async function loadProductOptionsBundlesByProductIds(
  productIds: string[]
): Promise<Map<string, ProductOptionsBundle>> {
  const unique = [...new Set(productIds.filter(Boolean))];
  const map = new Map<string, ProductOptionsBundle>();
  for (const id of unique) {
    map.set(id, emptyBundle());
  }
  if (unique.length === 0) return map;

  const { data: junctions, error: jErr } = await supabaseAdmin
    .from("product_options_junction")
    .select("*")
    .in("product_id", unique)
    .order("product_id", { ascending: true })
    .order("sort_order", { ascending: true });

  if (jErr) {
    console.error("loadProductOptionsBundles junction", jErr);
    return map;
  }

  const jRows = (junctions ?? []) as ProductOptionJunctionRow[];
  if (jRows.length === 0) {
    return map;
  }

  const optionIds = [...new Set(jRows.map((j) => j.option_id))];

  const { data: options, error: oErr } = await supabaseAdmin
    .from("options")
    .select("*")
    .in("id", optionIds);

  if (oErr) {
    console.error("loadProductOptionsBundles options", oErr);
    for (const id of unique) {
      map.set(id, emptyBundle());
    }
    return map;
  }

  const optRows = (options ?? []) as CatalogOptionRow[];
  const manualOptionIds = optRows
    .filter((option) => option.choice_source !== "category_products")
    .map((option) => option.id);

  let choices: unknown[] = [];
  if (manualOptionIds.length > 0) {
    const { data, error: cErr } = await supabaseAdmin
      .from("option_choices")
      .select("*")
      .in("option_id", manualOptionIds)
      .order("sort_order", { ascending: true });

    if (cErr) {
      console.error("loadProductOptionsBundles choices", cErr);
      for (const id of unique) {
        map.set(id, emptyBundle());
      }
      return map;
    }
    choices = data ?? [];
  }

  const dynamicChoices = await loadCategoryProductChoicesForOptions(optRows);
  const choiceRows = [
    ...((choices ?? []) as OptionChoiceRow[]),
    ...dynamicChoices,
  ];

  const junctionsByProduct = new Map<string, ProductOptionJunctionRow[]>();
  for (const row of jRows) {
    const pid = String(row.product_id);
    const list = junctionsByProduct.get(pid) ?? [];
    list.push(row);
    junctionsByProduct.set(pid, list);
  }

  for (const id of unique) {
    const rows = junctionsByProduct.get(id) ?? [];
    map.set(id, bundleForProductRows(rows, optRows, choiceRows));
  }

  return map;
}

export async function loadProductOptionsBundleByProductId(
  productId: string
): Promise<ProductOptionsBundle> {
  const map = await loadProductOptionsBundlesByProductIds([productId]);
  return map.get(productId) ?? emptyBundle();
}
