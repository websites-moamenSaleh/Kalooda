import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireRole, isAuthorized } from "@/lib/require-role";
import { broadcastStorefrontCatalog } from "@/lib/storefront-catalog-broadcast";
import type { Product } from "@/types/database";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(req, ["admin", "super_admin"]);
  if (!isAuthorized(authResult)) return authResult;

  try {
    const { id } = await params;
    const { unavailable_today } = await req.json();

    const { data, error } = await supabaseAdmin
      .from("products")
      .update({ unavailable_today: Boolean(unavailable_today) })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    void broadcastStorefrontCatalog({
      action: "UPDATE",
      product: data as Product,
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error("Toggle availability error:", err);
    return NextResponse.json(
      { error: "Failed to update availability" },
      { status: 500 }
    );
  }
}
