"use client";

import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";

type LatLng = { lat: number; lng: number };

interface LocationMapPickerProps {
  center: LatLng;
  onMarkerChange: (value: LatLng, formattedAddress: string | null) => void;
  language: "en" | "ar";
}

/**
 * Classic `google.maps.Map` after `loadGoogleMaps` — avoids a second Maps bootstrap
 * from `@vis.gl/react-google-maps` / `APIProvider` (duplicate JS + WebGL was a major thermal hit).
 */
export function LocationMapPicker({
  center,
  onMarkerChange,
  language,
}: LocationMapPickerProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { lat: centerLat, lng: centerLng } = center;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const onMarkerChangeRef = useRef(onMarkerChange);
  const initialCenterRef = useRef({ lat: centerLat, lng: centerLng });

  useEffect(() => {
    onMarkerChangeRef.current = onMarkerChange;
  }, [onMarkerChange]);

  useEffect(() => {
    if (!apiKey || !containerRef.current) return;
    const el = containerRef.current;
    const initialCenter = initialCenterRef.current;
    let cancelled = false;

    void (async () => {
      try {
        const googleObj = await loadGoogleMaps(language);
        if (cancelled || !el) return;

        const map = new googleObj.maps.Map(el, {
          center: initialCenter,
          zoom: 15,
          disableDefaultUI: true,
          gestureHandling: "greedy",
          clickableIcons: false,
        });
        mapRef.current = map;

        const marker = new googleObj.maps.Marker({
          position: initialCenter,
          map,
          draggable: true,
        });
        markerRef.current = marker;

        const emit = () => {
          const p = marker.getPosition();
          if (!p) return;
          onMarkerChangeRef.current({ lat: p.lat(), lng: p.lng() }, null);
        };

        listenersRef.current.push(
          marker.addListener("dragend", emit),
          map.addListener("click", (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return;
            marker.setPosition(e.latLng);
            emit();
          })
        );
      } catch {
        /* loadGoogleMaps already surfaced elsewhere */
      }
    })();

    return () => {
      cancelled = true;
      for (const l of listenersRef.current) {
        l.remove();
      }
      listenersRef.current = [];
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [apiKey, language]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    map.panTo({ lat: centerLat, lng: centerLng });
    marker.setPosition({ lat: centerLat, lng: centerLng });
  }, [centerLat, centerLng]);

  if (!apiKey) return null;

  return (
    <div
      ref={containerRef}
      className="h-[260px] w-full overflow-hidden rounded-[0.75rem]"
      aria-label="Map"
    />
  );
}
