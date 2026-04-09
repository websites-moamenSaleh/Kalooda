import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

function numFromEnv(name: string): number | null {
  const value = process.env[name];
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("business_settings")
      .select("pickup_name, pickup_address, pickup_latitude, pickup_longitude")
      .eq("id", true)
      .maybeSingle();

    if (error) throw error;

    const envFallback = {
      pickup_name: process.env.NEXT_PUBLIC_PICKUP_NAME ?? "Kalooda",
      pickup_address: process.env.NEXT_PUBLIC_PICKUP_ADDRESS ?? null,
      pickup_latitude: numFromEnv("NEXT_PUBLIC_PICKUP_LATITUDE"),
      pickup_longitude: numFromEnv("NEXT_PUBLIC_PICKUP_LONGITUDE"),
    };

    const payload = {
      pickup_name: data?.pickup_name ?? envFallback.pickup_name,
      pickup_address: data?.pickup_address ?? envFallback.pickup_address,
      pickup_latitude: data?.pickup_latitude ?? envFallback.pickup_latitude,
      pickup_longitude: data?.pickup_longitude ?? envFallback.pickup_longitude,
    };
    return NextResponse.json({ data: payload });
  } catch (err) {
    console.error("Business settings fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch business settings" }, { status: 500 });
  }
}
