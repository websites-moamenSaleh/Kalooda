import { cartLineOptionsPersistedSchema } from "@/lib/product-options/validate-selections";
import type { CartLineOptionsPersisted } from "@/lib/product-options/types";
import type { Product } from "@/types/database";
import { getProductEffectivePrice } from "@/lib/product-pricing";

function emptyPersist(product: Product): CartLineOptionsPersisted {
  const unit_price = getProductEffectivePrice(product);
  return {
    selections: {},
    snapshot: {
      choice_lines: [],
      options_subtotal: 0,
      unit_price,
    },
  };
}

/** Normalize DB / guest JSON into a valid CartLineOptionsPersisted; fill snapshot from product when missing. */
export function normalizeCartLineOptions(
  raw: unknown,
  product: Product
): CartLineOptionsPersisted {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyPersist(product);
  }
  const o = raw as Record<string, unknown>;
  const selRaw = o.selections;
  const selections: Record<string, string[]> =
    selRaw && typeof selRaw === "object" && !Array.isArray(selRaw)
      ? Object.fromEntries(
          Object.entries(selRaw as Record<string, unknown>).map(([k, v]) => [
            k,
            Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [],
          ])
        )
      : {};

  const candidate = {
    selections,
    snapshot:
      o.snapshot && typeof o.snapshot === "object"
        ? o.snapshot
        : emptyPersist(product).snapshot,
  };

  const parsed = cartLineOptionsPersistedSchema.safeParse(candidate);
  if (parsed.success) {
    const base = getProductEffectivePrice(product);
    const snap = parsed.data.snapshot;
    if (
      Object.keys(selections).length === 0 &&
      snap.choice_lines.length === 0 &&
      Math.abs(snap.unit_price - base) > 0.02
    ) {
      return {
        selections: parsed.data.selections,
        snapshot: { ...snap, unit_price: base, options_subtotal: 0 },
      };
    }
    return parsed.data;
  }

  return emptyPersist(product);
}
