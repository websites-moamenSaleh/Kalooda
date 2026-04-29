import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireRole, isAuthorized } from "@/lib/require-role";
import {
  ORDER_STATUSES,
  type OrderStatus,
  type FulfillmentType,
  canAdminSetStatus,
  canTokenSetStatus,
} from "@/lib/order-status";

function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (ORDER_STATUSES as readonly string[]).includes(value)
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await req.json();
    const status = body?.status;
    const token = req.nextUrl.searchParams.get("token");

    if (!isOrderStatus(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const selectColumns = token
      ? "id, delivery_token, delivery_token_expires_at, status, fulfillment_type"
      : "id, status, fulfillment_type";
    const { data: order, error: fetchErr } = await supabaseAdmin
      .from("orders")
      .select(selectColumns)
      .eq("id", orderId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const from = order.status as OrderStatus;
    const fulfillment: FulfillmentType =
      order.fulfillment_type === "pickup" ? "pickup" : "delivery";

    if (token) {
      const tokenOrder = order as typeof order & {
        delivery_token?: string | null;
        delivery_token_expires_at?: string | null;
      };
      if (!tokenOrder.delivery_token || tokenOrder.delivery_token !== token) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (
        !tokenOrder.delivery_token_expires_at ||
        new Date(tokenOrder.delivery_token_expires_at).getTime() <= Date.now()
      ) {
        return NextResponse.json({ error: "Delivery link expired" }, { status: 410 });
      }
      if (fulfillment !== "delivery") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!canTokenSetStatus(from, status)) {
        return NextResponse.json(
          { error: "Invalid status transition" },
          { status: 400 }
        );
      }
    } else {
      const authResult = await requireRole(req, ["admin", "super_admin"]);
      if (!isAuthorized(authResult)) return authResult;
      if (!canAdminSetStatus({ from, to: status, fulfillment })) {
        return NextResponse.json(
          { error: "Invalid status transition" },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabaseAdmin
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("Update order status error:", err);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
