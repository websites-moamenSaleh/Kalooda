import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireRole, requireSession, isAuthorized } from "@/lib/require-role";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const token = req.nextUrl.searchParams.get("token");

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Enrich order items with product image_url
    const productIds: string[] = (data.items as { product_id: string }[]).map(
      (i) => i.product_id
    );
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, image_url")
      .in("id", productIds);
    const imageMap = Object.fromEntries(
      (products ?? []).map((p: { id: string; image_url: string | null }) => [p.id, p.image_url])
    );
    const enrichedData = {
      ...data,
      items: (data.items as { product_id: string }[]).map((item) => ({
        ...item,
        image_url: imageMap[item.product_id] ?? null,
      })),
    };

    // Delivery driver access via token
    if (token) {
      if (data.delivery_token !== token) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json(enrichedData);
    }

    // Admin access
    const adminResult = await requireRole(req, ["admin", "super_admin"]);
    if (isAuthorized(adminResult)) return NextResponse.json(enrichedData);

    // Customer access — must own the order
    const customerResult = await requireSession(req);
    if (isAuthorized(customerResult)) {
      if (data.user_id !== customerResult.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json(enrichedData);
    }

    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  } catch (err) {
    console.error("Fetch order error:", err);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

