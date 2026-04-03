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

    // Delivery driver access via token
    if (token) {
      if (data.delivery_token !== token) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json(data);
    }

    // Admin access
    const adminResult = await requireRole(req, ["admin", "super_admin"]);
    if (isAuthorized(adminResult)) return NextResponse.json(data);

    // Customer access — must own the order
    const customerResult = await requireSession(req);
    if (isAuthorized(customerResult)) {
      if (data.user_id !== customerResult.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json(data);
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const authResult = await requireRole(req, ["admin", "super_admin"]);
  if (!isAuthorized(authResult)) return authResult;

  try {
    const { orderId } = await params;

    const { error } = await supabaseAdmin
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete order error:", err);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    );
  }
}
