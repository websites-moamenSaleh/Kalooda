export type AddressLocationSource =
  | "autocomplete"
  | "map"
  | "geolocation"
  | "saved";

/** True when the user typed street/city text but has not resolved the place via list, map, GPS, or a saved profile row. */
export function addressManualEntryNeedsListPick(draft: {
  street_line: string;
  city: string;
  location_source?: AddressLocationSource | null;
}): boolean {
  const hasTypedLocationText =
    draft.street_line.trim().length > 0 || draft.city.trim().length > 0;
  const src = draft.location_source;
  const resolved =
    src === "autocomplete" ||
    src === "map" ||
    src === "geolocation" ||
    src === "saved";
  return hasTypedLocationText && !resolved;
}
