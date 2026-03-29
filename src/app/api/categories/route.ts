import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("*")
      .order("name");

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("Fetch categories error:", err);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
