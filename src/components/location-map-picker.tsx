"use client";

import { APIProvider, Map, Marker, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useState } from "react";

type LatLng = { lat: number; lng: number };
type LatLngInput = google.maps.LatLng | LatLng | null | undefined;

interface MapInnerProps {
  center: LatLng;
  onMarkerChange: (value: LatLng, formattedAddress: string | null) => void;
}

function MapInner({ center, onMarkerChange }: MapInnerProps) {
  const map = useMap();
  const [markerPos, setMarkerPos] = useState<LatLng>(center);

  useEffect(() => {
    if (map) map.panTo(center);
  }, [center, map]);

  async function resolveAndEmit(latLng: LatLngInput) {
    if (!latLng) return;
    const next =
      typeof (latLng as google.maps.LatLng).lat === "function"
        ? {
            lat: (latLng as google.maps.LatLng).lat(),
            lng: (latLng as google.maps.LatLng).lng(),
          }
        : { lat: (latLng as LatLng).lat, lng: (latLng as LatLng).lng };
    setMarkerPos(next);
    let formattedAddress: string | null = null;
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ location: next });
      formattedAddress = result.results?.[0]?.formatted_address ?? null;
    } catch {
      formattedAddress = null;
    }
    onMarkerChange(next, formattedAddress);
  }

  async function onDragEnd(event: google.maps.MapMouseEvent) {
    await resolveAndEmit(event.latLng);
  }

  async function onMapClick(event: { detail: { latLng?: LatLng | null } }) {
    await resolveAndEmit(event.detail.latLng ?? null);
  }

  return (
    <Map
      defaultCenter={center}
      defaultZoom={15}
      style={{ width: "100%", height: "260px", borderRadius: "0.75rem" }}
      gestureHandling="greedy"
      disableDefaultUI
      onClick={onMapClick}
    >
      <Marker position={markerPos} draggable onDragEnd={onDragEnd} />
    </Map>
  );
}

interface LocationMapPickerProps {
  center: LatLng;
  onMarkerChange: (value: LatLng, formattedAddress: string | null) => void;
  language: "en" | "ar";
}

export function LocationMapPicker({
  center,
  onMarkerChange,
  language,
}: LocationMapPickerProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  return (
    <APIProvider apiKey={apiKey} language={language} libraries={["places"]}>
      <MapInner center={center} onMarkerChange={onMarkerChange} />
    </APIProvider>
  );
}
