"use client";

import dynamic from "next/dynamic";
import { Loader2, LocateFixed, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AddressLocationSource } from "@/lib/address-draft";
import { loadGoogleMaps } from "@/lib/google-maps-loader";

const LazyMapPicker = dynamic(
  () => import("@/components/location-map-picker").then((m) => m.LocationMapPicker),
  { ssr: false }
);

/** Center of northern Israel / Galilee — biases ranking within `componentRestrictions` country. */
const ADDRESS_AUTOCOMPLETE_MAP_BIAS = { lat: 32.72, lng: 35.28 } as const;

function parseAutocompleteCountryCodes(): string[] {
  const raw = process.env.NEXT_PUBLIC_ADDRESS_AUTOCOMPLETE_COUNTRY_CODES?.trim();
  if (raw) {
    const parts = raw
      .split(/[\s,]+/)
      .map((c) => c.toLowerCase())
      .filter((c) => /^[a-z]{2}$/.test(c));
    if (parts.length) return parts;
  }
  return ["il"];
}

function autocompleteComponentRestrictions(): google.maps.places.ComponentRestrictions {
  const codes = parseAutocompleteCountryCodes();
  return codes.length === 1 ? { country: codes[0]! } : { country: codes };
}

/** Drop obvious global hits before the delivery-zone RPC (covers API/key quirks). */
function coordsInLevantRoughBBox(lat: number, lng: number): boolean {
  return lat >= 29.35 && lat <= 33.75 && lng >= 33.85 && lng <= 36.05;
}

function buildIsraelLatLngBounds(googleObj: typeof google): google.maps.LatLngBounds {
  return new googleObj.maps.LatLngBounds(
    new googleObj.maps.LatLng(29.45, 34.15),
    new googleObj.maps.LatLng(33.55, 35.95)
  );
}

let autocompleteServiceCache: google.maps.places.AutocompleteService | null = null;
let autocompleteServiceGoogle: typeof google | null = null;

function getAutocompleteService(googleObj: typeof google): google.maps.places.AutocompleteService {
  if (autocompleteServiceCache && autocompleteServiceGoogle === googleObj) {
    return autocompleteServiceCache;
  }
  autocompleteServiceCache = new googleObj.maps.places.AutocompleteService();
  autocompleteServiceGoogle = googleObj;
  return autocompleteServiceCache;
}

/** Legacy AutocompleteService is callback-first; Promises are not reliable on all Maps builds. */
function getPlacePredictionsCallback(
  googleObj: typeof google,
  request: google.maps.places.AutocompletionRequest
): Promise<google.maps.places.AutocompletePrediction[]> {
  const service = getAutocompleteService(googleObj);
  const { PlacesServiceStatus } = googleObj.maps.places;
  return new Promise((resolve, reject) => {
    service.getPlacePredictions(request, (predictions, status) => {
      if (status === PlacesServiceStatus.ZERO_RESULTS) {
        resolve([]);
        return;
      }
      if (status !== PlacesServiceStatus.OK) {
        reject(new Error(String(status)));
        return;
      }
      resolve(predictions ?? []);
    });
  });
}

export interface AddressDraft {
  label_type: "home" | "work" | "other" | null;
  custom_label: string;
  city: string;
  street_line: string;
  building_number: string;
  formatted_address?: string;
  place_id?: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default?: boolean;
  /** How street/city coordinates were last resolved; cleared when the user edits street or city by typing. */
  location_source?: AddressLocationSource | null;
}

interface AddressEditorProps {
  locale: "en" | "ar";
  value: AddressDraft;
  onChange: (next: AddressDraft) => void;
  t: (key: string) => string;
}

type HydrateGeoOptions = {
  placeId?: string | null;
  /** Keep device or map-marker coordinates instead of the geocoder snap point. */
  coordinateOverride?: { lat: number; lng: number } | null;
  locationSource: AddressLocationSource;
};

function parseAddressParts(result: google.maps.GeocoderResult) {
  const parts = result.address_components ?? [];
  const byType = (type: string) => parts.find((c) => c.types.includes(type))?.long_name ?? "";
  const city = byType("locality") || byType("administrative_area_level_2");
  const streetName = byType("route");
  const streetNo = byType("street_number");
  const buildingNo = byType("subpremise") || byType("premise");
  return {
    city,
    street_line: [streetName, streetNo].filter(Boolean).join(" ").trim(),
    building_number: buildingNo || streetNo,
  };
}

interface ReverseFallbackAddress {
  city: string;
  street_line: string;
  building_number: string;
  formatted_address: string;
}

async function reverseGeocodeFallback(
  lat: number,
  lng: number,
  locale: "en" | "ar"
): Promise<ReverseFallbackAddress | null> {
  try {
    const language = locale === "ar" ? "ar" : "en";
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${encodeURIComponent(String(lat))}` +
      `&lon=${encodeURIComponent(String(lng))}` +
      `&accept-language=${encodeURIComponent(language)}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      display_name?: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        state_district?: string;
        road?: string;
        pedestrian?: string;
        house_number?: string;
      };
    };
    const city =
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.state_district ||
      "";
    const road = data.address?.road || data.address?.pedestrian || "";
    const houseNumber = data.address?.house_number || "";
    return {
      city,
      street_line: [road, houseNumber].filter(Boolean).join(" ").trim(),
      building_number: houseNumber,
      formatted_address: data.display_name || "",
    };
  } catch {
    return null;
  }
}

async function isInDeliveryZone(lat: number, lng: number): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/delivery-zones/check?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`
    );
    const data = (await res.json().catch(() => null)) as { deliverable?: boolean } | null;
    return Boolean(res.ok && data?.deliverable);
  } catch {
    return false;
  }
}

export function AddressEditor({ locale, value, onChange, t }: AddressEditorProps) {
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [, setMapsUnavailable] = useState(false);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [pickBlockedMessage, setPickBlockedMessage] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteRequestRef = useRef(0);
  const mapHydrateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const lastMapHydrateKeyRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (mapHydrateTimerRef.current) clearTimeout(mapHydrateTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showMapPicker && mapHydrateTimerRef.current) {
      clearTimeout(mapHydrateTimerRef.current);
      mapHydrateTimerRef.current = null;
    }
  }, [showMapPicker]);

  useEffect(() => {
    if (!showMapPicker) return;
    if (value.latitude != null && value.longitude != null) {
      setMapCenter({ lat: value.latitude, lng: value.longitude });
      return;
    }
    // Opening the map used to call high-accuracy GPS every time — very heavy on laptop thermals.
    // User can pan or tap "Use current location" for a real fix.
    setMapCenter({
      lat: ADDRESS_AUTOCOMPLETE_MAP_BIAS.lat,
      lng: ADDRESS_AUTOCOMPLETE_MAP_BIAS.lng,
    });
  }, [showMapPicker, value.latitude, value.longitude]);

  function invalidateManualLocationFields(nextStreet: string, nextCity: string) {
    setPickBlockedMessage(null);
    lastMapHydrateKeyRef.current = null;
    onChange({
      ...value,
      street_line: nextStreet,
      city: nextCity,
      formatted_address: "",
      location_source: null,
      latitude: null,
      longitude: null,
      place_id: null,
    });
  }

  async function hydrateFromLatLng(
    lat: number,
    lng: number,
    formattedAddressHint?: string | null
  ) {
    const coordKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (lastMapHydrateKeyRef.current === coordKey) return;

    try {
      const googleObj = await loadGoogleMaps(locale);
      if (!geocoderRef.current) geocoderRef.current = new googleObj.maps.Geocoder();
      const result = await geocoderRef.current.geocode({ location: { lat, lng } });
      if (result.results?.[0]) {
        await hydrateFromGeocodeResult(result.results[0], {
          coordinateOverride: { lat, lng },
          locationSource: "map",
        });
        lastMapHydrateKeyRef.current = coordKey;
        return;
      }
    } catch {
      // Continue with fallback path.
    }

    const fallback = await reverseGeocodeFallback(lat, lng, locale);
    if (fallback) {
      onChange({
        ...value,
        city: fallback.city || value.city,
        street_line: fallback.street_line || value.street_line,
        building_number: fallback.building_number || value.building_number,
        formatted_address:
          fallback.formatted_address || formattedAddressHint || value.formatted_address,
        place_id: null,
        latitude: lat,
        longitude: lng,
        location_source: "map",
      });
      lastMapHydrateKeyRef.current = coordKey;
      return;
    }

    onChange({
      ...value,
      formatted_address: formattedAddressHint ?? value.formatted_address,
      place_id: null,
      latitude: lat,
      longitude: lng,
      location_source: "map",
    });
    lastMapHydrateKeyRef.current = coordKey;
  }

  function scheduleHydrateFromMap(
    lat: number,
    lng: number,
    formattedAddressHint: string | null | undefined
  ) {
    if (mapHydrateTimerRef.current) clearTimeout(mapHydrateTimerRef.current);
    mapHydrateTimerRef.current = setTimeout(() => {
      mapHydrateTimerRef.current = null;
      void hydrateFromLatLng(lat, lng, formattedAddressHint ?? null);
    }, 700);
  }

  async function runAutocompleteInternal(input: string, requestId: number) {
    const trimmed = input.trim();
    if (!trimmed || trimmed.length < 3) {
      setPredictions([]);
      return;
    }
    setLoadingPredictions(true);
    try {
      const googleObj = await loadGoogleMaps(locale);
      setMapsUnavailable(false);
      const common: Pick<
        google.maps.places.AutocompletionRequest,
        "input" | "language" | "componentRestrictions" | "region"
      > = {
        input: trimmed,
        language: locale,
        componentRestrictions: autocompleteComponentRestrictions(),
        region: "il",
      };
      let raw: google.maps.places.AutocompletePrediction[];
      try {
        raw = await getPlacePredictionsCallback(googleObj, {
          ...common,
          locationRestriction: buildIsraelLatLngBounds(googleObj),
        });
      } catch {
        raw = await getPlacePredictionsCallback(googleObj, {
          ...common,
          locationBias: new googleObj.maps.Circle({
            center: ADDRESS_AUTOCOMPLETE_MAP_BIAS,
            radius: 55_000,
          }),
        });
      }
      if (requestId !== autocompleteRequestRef.current) return;
      setPredictions(raw.slice(0, 5));
    } catch {
      setMapsUnavailable(true);
      if (requestId === autocompleteRequestRef.current) setPredictions([]);
    } finally {
      if (requestId === autocompleteRequestRef.current) setLoadingPredictions(false);
    }
  }

  function scheduleAutocomplete(input: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmedInput = input.trim();
    if (!trimmedInput || trimmedInput.length < 3) {
      setPredictions([]);
      setLoadingPredictions(false);
      setPickBlockedMessage(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const requestId = ++autocompleteRequestRef.current;
      void runAutocompleteInternal(input, requestId);
    }, 800);
  }

  async function hydrateFromGeocodeResult(
    top: google.maps.GeocoderResult | undefined,
    options: HydrateGeoOptions
  ) {
    if (!top) return;
    const { placeId = null, coordinateOverride, locationSource } = options;
    const loc = top.geometry?.location;
    const lat =
      coordinateOverride?.lat ?? loc?.lat() ?? value.latitude ?? null;
    const lng =
      coordinateOverride?.lng ?? loc?.lng() ?? value.longitude ?? null;
    const parsed = parseAddressParts(top);
    const buildingNumber = parsed.building_number || value.building_number;
    onChange({
      ...value,
      city: parsed.city || value.city,
      street_line: parsed.street_line || value.street_line,
      building_number: buildingNumber,
      formatted_address: top.formatted_address || value.formatted_address,
      place_id: placeId,
      latitude: lat,
      longitude: lng,
      location_source: locationSource,
    });
  }

  async function selectPrediction(prediction: google.maps.places.AutocompletePrediction) {
    setPickBlockedMessage(null);
    try {
      const googleObj = await loadGoogleMaps(locale);
      setMapsUnavailable(false);
      if (!geocoderRef.current) geocoderRef.current = new googleObj.maps.Geocoder();
      const result = await geocoderRef.current.geocode({ placeId: prediction.place_id });
      const top = result.results?.[0];
      const loc = top?.geometry?.location;
      const lat = loc?.lat();
      const lng = loc?.lng();
      if (lat == null || lng == null || !top) {
        setMapsUnavailable(true);
        return;
      }
      if (!coordsInLevantRoughBBox(lat, lng)) {
        setPickBlockedMessage(t("addressSuggestionOutsideDeliveryZone"));
        return;
      }
      const deliverable = await isInDeliveryZone(lat, lng);
      if (!deliverable) {
        setPickBlockedMessage(t("addressSuggestionOutsideDeliveryZone"));
        return;
      }
      await hydrateFromGeocodeResult(top, {
        placeId: prediction.place_id,
        locationSource: "autocomplete",
      });
      setPredictions([]);
    } catch {
      setMapsUnavailable(true);
      setPredictions([]);
    }
  }

  function useCurrentLocation() {
    setLoadingGeo(true);
    setGeoDenied(false);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const nextLat = Number(pos.coords.latitude.toFixed(6));
          const nextLng = Number(pos.coords.longitude.toFixed(6));
          let hydrated = false;
          try {
            const googleObj = await loadGoogleMaps(locale);
            setMapsUnavailable(false);
            if (!geocoderRef.current) geocoderRef.current = new googleObj.maps.Geocoder();
            const result = await geocoderRef.current.geocode({
              location: { lat: nextLat, lng: nextLng },
            });
            if (result.results?.[0]) {
              await hydrateFromGeocodeResult(result.results[0], {
                coordinateOverride: { lat: nextLat, lng: nextLng },
                locationSource: "geolocation",
              });
              hydrated = true;
            }
          } catch {
            setMapsUnavailable(true);
          }

          if (!hydrated) {
            const fallback = await reverseGeocodeFallback(nextLat, nextLng, locale);
            if (fallback) {
              onChange({
                ...value,
                city: fallback.city || value.city,
                street_line: fallback.street_line || value.street_line,
                building_number: fallback.building_number || value.building_number,
                formatted_address: fallback.formatted_address || value.formatted_address,
                place_id: null,
                latitude: nextLat,
                longitude: nextLng,
                location_source: "geolocation",
              });
              hydrated = true;
            }
          }

          if (!hydrated) {
            onChange({
              ...value,
              place_id: null,
              latitude: nextLat,
              longitude: nextLng,
              location_source: "geolocation",
            });
          }
        } catch {
          // Keep manual entry path available when reverse geocoding fails.
        } finally {
          setLoadingGeo(false);
        }
      },
      (error) => {
        setLoadingGeo(false);
        if (error.code === error.PERMISSION_DENIED) setGeoDenied(true);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 }
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {t("addressNameOptional")}
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...value, label_type: "home", custom_label: "" })}
            className={`rounded-lg border py-2 text-sm ${
              value.label_type === "home" ? "border-primary bg-primary/10 text-primary-dark" : "border-[#1F443C]/12"
            }`}
          >
            {t("addressNameHome")}
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...value, label_type: "work", custom_label: "" })}
            className={`rounded-lg border py-2 text-sm ${
              value.label_type === "work" ? "border-primary bg-primary/10 text-primary-dark" : "border-[#1F443C]/12"
            }`}
          >
            {t("addressNameWork")}
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...value, label_type: "other" })}
            className={`rounded-lg border py-2 text-sm ${
              value.label_type === "other" ? "border-primary bg-primary/10 text-primary-dark" : "border-[#1F443C]/12"
            }`}
          >
            {t("addressNameOther")}
          </button>
        </div>
        {value.label_type === "other" ? (
          <input
            className="input-premium mt-2"
            value={value.custom_label}
            onChange={(e) => onChange({ ...value, custom_label: e.target.value })}
            placeholder={t("addressNameOtherPlaceholder")}
          />
        ) : null}
      </div>

      <div className="space-y-2">
        <input
          value={value.street_line}
          onFocus={() => {
            void loadGoogleMaps(locale)
              .then(() => setMapsUnavailable(false))
              .catch(() => setMapsUnavailable(true));
          }}
          onChange={(e) => {
            const next = e.target.value;
            invalidateManualLocationFields(next, value.city);
            scheduleAutocomplete(next);
          }}
          className="input-premium"
          placeholder={t("addressStreetLinePlaceholder")}
          autoComplete="street-address"
        />
        {pickBlockedMessage ? (
          <p className="text-xs text-amber-700">{pickBlockedMessage}</p>
        ) : null}
        {loadingPredictions ? (
          <p className="text-xs text-ink-soft">{t("addressSearching")}</p>
        ) : predictions.length ? (
          <div className="rounded-lg border border-[#1F443C]/15 bg-white">
            {predictions.map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                onClick={() => void selectPrediction(prediction)}
                className="flex w-full items-start gap-2 border-b border-[#1F443C]/10 px-3 py-2 text-start text-sm text-ink last:border-0"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-dark" />
                <span>{prediction.description}</span>
              </button>
            ))}
          </div>
        ) : value.street_line.trim().length >= 3 &&
          !loadingPredictions &&
          !value.location_source ? (
          <p className="text-xs text-ink-soft">{t("addressNoSuggestionsInDeliveryZone")}</p>
        ) : null}
      </div>

      <input
        value={value.city}
        onChange={(e) => {
          const next = e.target.value;
          invalidateManualLocationFields(value.street_line, next);
          scheduleAutocomplete(value.street_line);
        }}
        className="input-premium"
        placeholder={t("addressCityPlaceholder")}
      />
      <input
        value={value.building_number}
        onChange={(e) => onChange({ ...value, building_number: e.target.value })}
        className="input-premium"
        placeholder={t("addressBuildingNumberPlaceholder")}
      />

      <button
        type="button"
        onClick={useCurrentLocation}
        className="inline-flex items-center gap-2 rounded-lg border border-[#1F443C]/15 px-3 py-2 text-sm font-medium text-ink-soft hover:border-[#1F443C]/25"
      >
        {loadingGeo ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
        {t("useCurrentLocation")}
      </button>
      <button
        type="button"
        onClick={() => setShowMapPicker((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-lg border border-[#1F443C]/15 px-3 py-2 text-sm font-medium text-ink-soft hover:border-[#1F443C]/25"
      >
        <MapPin className="h-4 w-4" />
        {showMapPicker ? t("hideMapPicker") : t("chooseOnMap")}
      </button>
      {showMapPicker ? (
        <div className="overflow-hidden rounded-xl border border-[#1F443C]/12 p-2">
          <LazyMapPicker
            center={
              mapCenter ?? {
                lat: value.latitude ?? 31.9076,
                lng: value.longitude ?? 35.2042,
              }
            }
            language={locale}
            onMarkerChange={(next, formattedAddress) => {
              scheduleHydrateFromMap(next.lat, next.lng, formattedAddress);
            }}
          />
        </div>
      ) : null}
      {geoDenied ? (
        <p className="text-xs text-amber-700">{t("geoPermissionDeniedUseSearch")}</p>
      ) : null}
    </div>
  );
}
