import type {
  HiddenConditionalV1,
  ProductOptionJunctionRow,
  SelectionsMap,
} from "@/lib/product-options/types";

function isHiddenConditionalV1(v: unknown): v is HiddenConditionalV1 {
  if (!v || typeof v !== "object") return false;
  const s = (v as { show_if?: unknown }).show_if;
  if (!s || typeof s !== "object") return false;
  const o = s as { option_id?: unknown; choice_id?: unknown };
  return typeof o.option_id === "string" && typeof o.choice_id === "string";
}

export function isStepVisible(
  junction: ProductOptionJunctionRow,
  selections: SelectionsMap
): boolean {
  const raw = junction.hidden_conditional;
  if (raw == null) return true;
  if (!isHiddenConditionalV1(raw)) return true;
  const { option_id, choice_id } = raw.show_if;
  const picked = selections[option_id] ?? [];
  return picked.includes(choice_id);
}

export function visibleJunctionsSorted(
  junctions: ProductOptionJunctionRow[],
  selections: SelectionsMap
): ProductOptionJunctionRow[] {
  return [...junctions]
    .filter((j) => isStepVisible(j, selections))
    .sort((a, b) => a.sort_order - b.sort_order);
}
