import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireRole, isAuthorized } from "@/lib/require-role";
import { CANCELLATION_REASONS } from "@/lib/cancellation-reasons";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const authResult = await requireRole(req, ["admin", "super_admin"]);
  if (!isAuthorized(authResult)) return authResult;

  try {
    const { orderId } = await params;
    const body = await req.json().catch(() => ({}));
    const { reason, notes } = body as { reason?: string; notes?: string };

    if (!reason || !(CANCELLATION_REASONS as readonly string[]).includes(reason)) {
      return NextResponse.json(
        { error: "A valid cancellation reason is required" },
        { status: 400 }
      );
    }

    const { data: order, error: fetchErr } = await supabaseAdmin
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status === "completed" || order.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot cancel a completed or already cancelled order" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("orders")
      .update({
        status: "cancelled",
        cancellation_reason: reason,
        cancellation_notes: notes?.trim() || null,
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("Cancel order error:", err);
    return NextResponse.json(
      { error: "Failed to cancel order" },
      { status: 500 }
    );
  }
}
