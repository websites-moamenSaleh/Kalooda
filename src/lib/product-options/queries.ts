import type {
  CatalogOptionRow,
  OptionChoiceRow,
  ProductOptionJunctionRow,
} from "@/lib/product-options/types";

/** Shape returned by GET /api/products/[id]/options (nested JSON). */
export type ProductOptionsApiResponse = {
  junctions: ProductOptionJunctionRow[];
  options: CatalogOptionRow[];
  choices: OptionChoiceRow[];
};
