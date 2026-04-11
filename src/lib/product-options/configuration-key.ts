import type { SelectionsMap } from "@/lib/product-options/types";

/** Stable key for merging cart lines (same product + same configuration). */
export function configurationKeyFromSelections(selections: SelectionsMap): string {
  const optionIds = Object.keys(selections).sort();
  const normalized = optionIds.map((oid) => [oid, [...selections[oid]].sort()] as const);
  return JSON.stringify(normalized);
}

export function isSimpleConfiguration(selections: SelectionsMap): boolean {
  return configurationKeyFromSelections(selections) === "[]";
}

export function parseConfigurationKey(key: string): SelectionsMap | null {
  try {
    const parsed = JSON.parse(key) as unknown;
    if (!Array.isArray(parsed)) return null;
    const out: SelectionsMap = {};
    for (const entry of parsed) {
      if (!Array.isArray(entry) || entry.length !== 2) return null;
      const [oid, ids] = entry;
      if (typeof oid !== "string" || !Array.isArray(ids)) return null;
      out[oid] = ids.filter((x): x is string => typeof x === "string");
    }
    return out;
  } catch {
    return null;
  }
}
