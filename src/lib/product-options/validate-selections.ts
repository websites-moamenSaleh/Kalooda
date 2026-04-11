import { z } from "zod";
import type { ProductOptionsBundle, SelectionsMap } from "@/lib/product-options/types";
import { visibleJunctionsSorted } from "@/lib/product-options/visibility";

export const selectionsMapSchema = z.record(z.string().uuid(), z.array(z.string().uuid()));

export const cartLineOptionsPersistedSchema = z.object({
  selections: selectionsMapSchema,
  snapshot: z.object({
    choice_lines: z.array(
      z.object({
        option_id: z.string().uuid(),
        choice_id: z.string().uuid(),
        name_en: z.string(),
        name_ar: z.string().nullable(),
        price_applied: z.number(),
      })
    ),
    options_subtotal: z.number(),
    unit_price: z.number(),
  }),
});

export function validateStepSelections(
  junction: {
    min_select: number;
    max_select: number;
    must_select_count: number;
  },
  optionType: "single" | "multiple",
  enabledChoiceIds: Set<string>,
  selectedIds: string[]
): string | null {
  for (const id of selectedIds) {
    if (!enabledChoiceIds.has(id)) return "invalid_choice";
  }
  if (optionType === "single") {
    const uniq = new Set(selectedIds);
    if (uniq.size !== selectedIds.length) return "duplicate_choice";
    if (selectedIds.length > 1) return "single_only_one";
  }
  const n = selectedIds.length;
  let minReq: number;
  if (junction.must_select_count > 0) {
    minReq = Math.max(junction.min_select, junction.must_select_count);
  } else if (
    optionType === "multiple" &&
    junction.min_select === 1 &&
    (junction.max_select > 1 || enabledChoiceIds.size > 1)
  ) {
    // must_select_count === 0: step is optional. min_select 1 here is usually the old default
    // while "must" was cleared to 0. Allow 0 picks. Require min_select >= 2 or must_select_count > 0
    // when a minimum number of picks is mandatory. (min 1 max 1 with a single enabled choice
    // still requires that one pick.)
    minReq = 0;
  } else {
    minReq = junction.min_select;
  }
  if (n < minReq) return "below_min";
  if (n > junction.max_select) return "above_max";
  return null;
}

export function validateAllVisibleSteps(
  bundle: ProductOptionsBundle,
  selections: SelectionsMap
): { ok: true } | { ok: false; step_option_id: string; code: string } {
  const visible = visibleJunctionsSorted(bundle.junctions, selections);
  for (const j of visible) {
    const opt = bundle.optionsById.get(j.option_id);
    if (!opt) return { ok: false, step_option_id: j.option_id, code: "missing_option" };
    const allChoices = bundle.choicesByOptionId.get(j.option_id) ?? [];
    const enabled = new Set(
      allChoices.filter((c) => c.is_enabled).map((c) => c.id)
    );
    const selected = selections[j.option_id] ?? [];
    const err = validateStepSelections(j, opt.type, enabled, selected);
    if (err) return { ok: false, step_option_id: j.option_id, code: err };
  }
  return { ok: true };
}
