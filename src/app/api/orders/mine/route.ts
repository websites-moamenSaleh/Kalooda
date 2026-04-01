import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireSession, isAuthorized } from "@/lib/require-role";

export async function GET(req: NextRequest) {
  const authResult = await requireSession(req);
  if (!isAuthorized(authResult)) return authResult;
  const { userId } = authResult;

  try {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("GET /api/orders/mine:", err);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
