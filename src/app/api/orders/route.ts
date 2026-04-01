import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireRole, requireSession, isAuthorized } from "@/lib/require-role";

export async function GET(req: NextRequest) {
  const authResult = await requireRole(req, ["admin", "super_admin"]);
  if (!isAuthorized(authResult)) return authResult;

  try {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("Fetch orders error:", err);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireSession(req);
  if (!isAuthorized(authResult)) return authResult;

  const { userId } = authResult;

  try {
    const body = await req.json();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("full_name, phone")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      return NextResponse.json(
        {
          error: "Profile not found. Please sign in again or contact support.",
          code: "PROFILE_INCOMPLETE",
        },
        { status: 400 }
      );
    }

    const nameFromBody =
      typeof body.customer_name === "string" ? body.customer_name.trim() : "";
    const phoneFromBody =
      typeof body.customer_phone === "string" ? body.customer_phone.trim() : "";

    const customerName =
      nameFromBody || profile?.full_name?.trim() || "";
    const customerPhone =
      phoneFromBody || profile?.phone?.trim() || "";

    if (!customerName || !customerPhone) {
      return NextResponse.json(
        {
          error: "Name and phone are required. Add them to your account or checkout form.",
          code: "PROFILE_INCOMPLETE",
        },
        { status: 400 }
      );
    }

    if (nameFromBody || phoneFromBody) {
      const patch: { full_name?: string; phone?: string } = {};
      if (nameFromBody) patch.full_name = nameFromBody;
      if (phoneFromBody) patch.phone = phoneFromBody;
      const { error: updErr } = await supabaseAdmin
        .from("profiles")
        .update(patch)
        .eq("id", userId);
      if (updErr) console.error("Profile update on order:", updErr);
    }

    const { count } = await supabaseAdmin
      .from("orders")
      .select("*", { count: "exact", head: true });
    const displayId = `ORD-${7721 + (count ?? 0)}`;

    const { data, error } = await supabaseAdmin
      .from("orders")
      .insert({
        display_id: displayId,
        user_id: userId,
        customer_name: customerName,
        customer_phone: customerPhone,
        items: body.items,
        total_price: body.total_price,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      const blob = `${error.message} ${error.details ?? ""} ${error.hint ?? ""}`;
      const missingUserId =
        error.code === "42703" ||
        (/user_id/i.test(blob) && /orders/i.test(blob)) ||
        /schema cache/i.test(blob);
      if (missingUserId) {
        return NextResponse.json(
          {
            error:
              "Database is missing column orders.user_id. Apply Supabase migrations (see supabase/migrations/20260401000000_orders_user_id.sql), then retry.",
            code: "SCHEMA_OUTDATED",
          },
          { status: 503 }
        );
      }
      throw error;
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Create order error:", err);
    const details =
      process.env.NODE_ENV === "development" && err instanceof Error
        ? err.message
        : undefined;
    return NextResponse.json(
      {
        error: "Failed to create order",
        ...(details ? { details } : {}),
      },
      { status: 500 }
    );
  }
}
