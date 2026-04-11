import type {
  CatalogOptionRow,
  OptionChoiceRow,
  ProductOptionJunctionRow,
  ProductOptionsBundle,
  SelectionsMap,
  SnapshotChoiceLine,
} from "@/lib/product-options/types";
import { visibleJunctionsSorted } from "@/lib/product-options/visibility";

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

/** v1: ignore vat_percentage on choices (no extra VAT layer). */
function choiceDisplayMarkup(choice: OptionChoiceRow): number {
  const m = Number(choice.price_markup) || 0;
  return Math.max(0, m);
}

/**
 * Compute per-choice applied prices (items_free = first N selected choices, by choice sort_order, pay no markup).
 */
export function computeOptionsPricing(
  bundle: ProductOptionsBundle,
  selections: SelectionsMap,
  baseEffectiveUnit: number
): {
  choice_lines: SnapshotChoiceLine[];
  options_subtotal: number;
  unit_price: number;
} {
  const visible = visibleJunctionsSorted(bundle.junctions, selections);
  const choiceLines: SnapshotChoiceLine[] = [];
  let optionsSubtotal = 0;

  for (const j of visible) {
    const choices = bundle.choicesByOptionId.get(j.option_id) ?? [];
    const byId = new Map(choices.map((c) => [c.id, c]));
    const selectedIds = selections[j.option_id] ?? [];
    const selectedRows = selectedIds
      .map((id) => byId.get(id))
      .filter((c): c is OptionChoiceRow => Boolean(c && c.is_enabled));
    selectedRows.sort((a, b) => {
      const byOrder = a.sort_order - b.sort_order;
      if (byOrder !== 0) return byOrder;
      return a.id.localeCompare(b.id);
    });

    const freeCount = Math.max(0, j.items_free);
    selectedRows.forEach((choice, index) => {
      const fullMarkup = choiceDisplayMarkup(choice);
      const priceApplied = index < freeCount ? 0 : fullMarkup;
      optionsSubtotal += priceApplied;
      choiceLines.push({
        option_id: j.option_id,
        choice_id: choice.id,
        name_en: choice.name_en,
        name_ar: choice.name_ar,
        price_applied: roundPrice(priceApplied),
      });
    });
  }

  optionsSubtotal = roundPrice(optionsSubtotal);
  const unit_price = roundPrice(baseEffectiveUnit + optionsSubtotal);
  return {
    choice_lines: choiceLines,
    options_subtotal: optionsSubtotal,
    unit_price,
  };
}

export function buildProductOptionsBundle(
  junctions: ProductOptionJunctionRow[],
  options: CatalogOptionRow[],
  choices: OptionChoiceRow[]
): ProductOptionsBundle {
  const optionsById = new Map(options.map((o) => [o.id, o]));
  const choicesByOptionId = new Map<string, OptionChoiceRow[]>();
  for (const c of choices) {
    const list = choicesByOptionId.get(c.option_id) ?? [];
    list.push(c);
    choicesByOptionId.set(c.option_id, list);
  }
  for (const [, list] of choicesByOptionId) {
    list.sort((a, b) => {
      const byOrder = a.sort_order - b.sort_order;
      if (byOrder !== 0) return byOrder;
      return a.id.localeCompare(b.id);
    });
  }
  return { junctions, optionsById, choicesByOptionId };
}

export function bundleForProductRows(
  junctionRows: ProductOptionJunctionRow[],
  optionRows: CatalogOptionRow[],
  choiceRows: OptionChoiceRow[]
): ProductOptionsBundle {
  const optIds = new Set(junctionRows.map((j) => j.option_id));
  const filteredOpts = optionRows.filter((o) => optIds.has(o.id));
  const filteredChoices = choiceRows.filter((c) => optIds.has(c.option_id));
  return buildProductOptionsBundle(junctionRows, filteredOpts, filteredChoices);
}
