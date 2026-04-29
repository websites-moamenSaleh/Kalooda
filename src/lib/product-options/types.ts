/** Row shape for public.options (avoid naming conflict with TS `Options`). */
export type CatalogOptionRow = {
  id: string;
  type: "single" | "multiple";
  title_en: string;
  title_ar: string | null;
  choice_source: "manual" | "category_products";
  source_category_id: string | null;
  show_to_courier: boolean;
  pos_id: string | null;
  created_at?: string;
  updated_at?: string;
};

export type OptionChoiceRow = {
  id: string;
  option_id: string;
  name_en: string;
  name_ar: string | null;
  price_markup: number;
  vat_percentage: number | null;
  pos_id: string | null;
  is_default: boolean;
  is_enabled: boolean;
  sort_order: number;
};

export type HiddenConditionalV1 = {
  show_if: { option_id: string; choice_id: string };
};

export type ProductOptionJunctionRow = {
  product_id: string;
  option_id: string;
  sort_order: number;
  min_select: number;
  max_select: number;
  items_free: number;
  hidden_conditional: HiddenConditionalV1 | null;
  display_name_en: string | null;
  display_name_ar: string | null;
  pos_id: string | null;
};

/** Wizard/API: selected choice ids per option. */
export type SelectionsMap = Record<string, string[]>;

export type SnapshotChoiceLine = {
  option_id: string;
  choice_id: string;
  name_en: string;
  name_ar: string | null;
  price_applied: number;
};

export type CartOptionsSnapshot = {
  choice_lines: SnapshotChoiceLine[];
  options_subtotal: number;
  /** Base effective product price + options_subtotal (per unit). */
  unit_price: number;
};

/** Persisted on cart row and sent to checkout / orders. */
export type CartLineOptionsPersisted = {
  selections: SelectionsMap;
  snapshot: CartOptionsSnapshot;
};

export type ProductOptionsBundle = {
  junctions: ProductOptionJunctionRow[];
  optionsById: Map<string, CatalogOptionRow>;
  choicesByOptionId: Map<string, OptionChoiceRow[]>;
};
