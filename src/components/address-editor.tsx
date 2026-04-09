"use client";

import dynamic from "next/dynamic";
import { Loader2, LocateFixed, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";

const LazyMapPicker = dynamic(
  () => import("@/components/location-map-picker").then((m) => m.LocationMapPicker),
  { ssr: false }
);

export interface AddressDraft {
  label_type: "home" | "work" | "other" | null;
  custom_label: string;
  city: string;
  street_line: string;
  building_number: string;
  formatted_address?: string;
  latitude: number | null;
  longitude: number | null;
  is_default?: boolean;
}

interface AddressEditorProps {
  locale: "en" | "ar";
  value: AddressDraft;
  onChange: (next: AddressDraft) => void;
  t: (key: string) => string;
}

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

async function resolveClosestBuilding(
  lat: number,
  lng: number,
  locale: "en" | "ar"
): Promise<string> {
  try {
    const googleObj = await loadGoogleMaps(locale);
    const fromGoogle = await new Promise<string>((resolve) => {
      const service = new googleObj.maps.places.PlacesService(document.createElement("div"));
      service.nearbySearch(
        {
          location: { lat, lng },
          radius: 60,
          type: "premise",
        },
        (results, status) => {
          if (status !== googleObj.maps.places.PlacesServiceStatus.OK || !results?.length) {
            resolve("");
            return;
          }
          const nearest = results[0];
          const vicinity = nearest.vicinity ?? "";
          const numeric = vicinity.match(/\b\d+[A-Za-z\-\/]?\b/)?.[0] ?? "";
          if (numeric) {
            resolve(numeric);
            return;
          }
          resolve((nearest.name ?? "").trim());
        }
      );
    });
    return fromGoogle;
  } catch {
    return "";
  }
}

export function AddressEditor({ locale, value, onChange, t }: AddressEditorProps) {
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [, setMapsUnavailable] = useState(false);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>(
    []
  );

  useEffect(() => {
    if (!showMapPicker) return;
    if (value.latitude != null && value.longitude != null) {
      setMapCenter({ lat: value.latitude, lng: value.longitude });
      return;
    }

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setMapCenter({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
      },
      () => {
        if (cancelled) return;
        setMapCenter({ lat: 31.9076, lng: 35.2042 });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    return () => {
      cancelled = true;
    };
  }, [showMapPicker, value.latitude, value.longitude]);

  async function hydrateFromLatLng(
    lat: number,
    lng: number,
    formattedAddressHint?: string | null
  ) {
    try {
      const googleObj = await loadGoogleMaps(locale);
      const geocoder = new googleObj.maps.Geocoder();
      const result = await geocoder.geocode({ location: { lat, lng } });
      if (result.results?.[0]) {
        await hydrateFromGeocodeResult(result.results[0]);
        return;
      }
    } catch {
      // Continue with fallback path.
    }

    const fallback = await reverseGeocodeFallback(lat, lng, locale);
    if (fallback) {
      const closestBuilding =
        fallback.building_number || (await resolveClosestBuilding(lat, lng, locale));
      onChange({
        ...value,
        city: fallback.city || value.city,
        street_line: fallback.street_line || value.street_line,
        building_number: closestBuilding || value.building_number,
        formatted_address:
          fallback.formatted_address || formattedAddressHint || value.formatted_address,
        latitude: lat,
        longitude: lng,
      });
      return;
    }

    onChange({
      ...value,
      formatted_address: formattedAddressHint ?? value.formatted_address,
      latitude: lat,
      longitude: lng,
    });
  }

  async function runAutocomplete(input: string) {
    if (!input.trim()) {
      setPredictions([]);
      return;
    }
    setLoadingPredictions(true);
    try {
      const googleObj = await loadGoogleMaps(locale);
      setMapsUnavailable(false);
      const service = new googleObj.maps.places.AutocompleteService();
      const result = await service.getPlacePredictions({ input, language: locale });
      setPredictions(result.predictions ?? []);
    } catch {
      setMapsUnavailable(true);
      setPredictions([]);
    } finally {
      setLoadingPredictions(false);
    }
  }

  async function hydrateFromGeocodeResult(top: google.maps.GeocoderResult | undefined) {
    if (!top) return;
    const loc = top.geometry?.location;
    const parsed = parseAddressParts(top);
    const lat = loc?.lat() ?? value.latitude ?? null;
    const lng = loc?.lng() ?? value.longitude ?? null;
    let buildingNumber = parsed.building_number || value.building_number;
    if (!buildingNumber && lat != null && lng != null) {
      buildingNumber = await resolveClosestBuilding(lat, lng, locale);
    }
    onChange({
      ...value,
      city: parsed.city || value.city,
      street_line: parsed.street_line || value.street_line,
      building_number: buildingNumber,
      formatted_address: top.formatted_address || value.formatted_address,
      latitude: lat,
      longitude: lng,
    });
  }

  async function selectPrediction(prediction: google.maps.places.AutocompletePrediction) {
    try {
      const googleObj = await loadGoogleMaps(locale);
      setMapsUnavailable(false);
      const geocoder = new googleObj.maps.Geocoder();
      const result = await geocoder.geocode({ placeId: prediction.place_id });
      await hydrateFromGeocodeResult(result.results?.[0]);
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
            const geocoder = new googleObj.maps.Geocoder();
            const result = await geocoder.geocode({ location: { lat: nextLat, lng: nextLng } });
            if (result.results?.[0]) {
              await hydrateFromGeocodeResult(result.results[0]);
              hydrated = true;
            }
          } catch {
            setMapsUnavailable(true);
          }

          if (!hydrated) {
            const fallback = await reverseGeocodeFallback(nextLat, nextLng, locale);
            if (fallback) {
              const closestBuilding =
                fallback.building_number || (await resolveClosestBuilding(nextLat, nextLng, locale));
              onChange({
                ...value,
                city: fallback.city || value.city,
                street_line: fallback.street_line || value.street_line,
                building_number: closestBuilding || value.building_number,
                formatted_address: fallback.formatted_address || value.formatted_address,
                latitude: nextLat,
                longitude: nextLng,
              });
              hydrated = true;
            }
          }

          if (!hydrated) {
            const closestBuilding = await resolveClosestBuilding(nextLat, nextLng, locale);
            onChange({
              ...value,
              building_number: closestBuilding || value.building_number,
              latitude: nextLat,
              longitude: nextLng,
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
      { enableHighAccuracy: true, timeout: 10000 }
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
            onChange({ ...value, street_line: e.target.value });
            void runAutocomplete(e.target.value);
          }}
          className="input-premium"
          placeholder={t("addressStreetLinePlaceholder")}
          autoComplete="street-address"
        />
        {loadingPredictions ? (
          <p className="text-xs text-ink-soft">{t("addressSearching")}</p>
        ) : predictions.length ? (
          <div className="rounded-lg border border-[#1F443C]/15 bg-white">
            {predictions.slice(0, 5).map((prediction) => (
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
        ) : null}
      </div>

      <input
        value={value.city}
        onChange={(e) => onChange({ ...value, city: e.target.value })}
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
              void hydrateFromLatLng(next.lat, next.lng, formattedAddress);
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
