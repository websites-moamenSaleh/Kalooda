import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireRole, requireSession, isAuthorized } from "@/lib/require-role";
import {
  createOrderBodySchema,
  ORDER_VALIDATION_ERROR,
} from "@/lib/order-create-body";

const ORD_PREFIX = /^ORD-(\d+)$/;

async function nextOrderDisplayId(): Promise<string> {
  const { data: rows, error } = await supabaseAdmin
    .from("orders")
    .select("display_id");

  if (error) throw error;

  let maxSeq = 7720;
  for (const r of rows ?? []) {
    const m = ORD_PREFIX.exec(r.display_id ?? "");
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  return `ORD-${maxSeq + 1}`;
}

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
    const rawBody = await req.json();
    const parsedBody = createOrderBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Invalid order request",
          code: ORDER_VALIDATION_ERROR,
          issues: parsedBody.error.flatten(),
        },
        { status: 400 }
      );
    }
    const body = parsedBody.data;

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
      typeof body.customer_phone === "string"
        ? body.customer_phone.trim()
        : "";

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

    let lastError: { code?: string; message: string; details?: string; hint?: string } | null =
      null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const displayId = await nextOrderDisplayId();

      const insertResult = await supabaseAdmin
        .from("orders")
        .insert({
          display_id: displayId,
          user_id: userId,
          customer_name: customerName,
          customer_phone: customerPhone,
          items: body.items,
          total_price: body.total_price,
          status: "pending",
          fulfillment_type: body.fulfillment_type,
          delivery_address: body.delivery_address,
          payment_method: body.payment_method,
        })
        .select()
        .single();

      const { data: row, error } = insertResult;
      lastError = error;

      if (!error) {
        if (
          body.save_address_to_profile &&
          body.fulfillment_type === "delivery" &&
          body.delivery_address
        ) {
          const { error: addrErr } = await supabaseAdmin
            .from("profiles")
            .update({ delivery_address: body.delivery_address })
            .eq("id", userId);
          if (addrErr) console.error("Profile delivery_address on order:", addrErr);
        }
        return NextResponse.json(row, { status: 201 });
      }

      if (error.code === "23505") {
        continue;
      }

      const blob = `${error.message} ${error.details ?? ""} ${error.hint ?? ""}`;
      const schemaRelated =
        error.code === "42703" ||
        (/user_id/i.test(blob) && /orders/i.test(blob)) ||
        /schema cache/i.test(blob);
      if (schemaRelated) {
        if (/user_id/i.test(blob) && /orders/i.test(blob)) {
          return NextResponse.json(
            {
              error:
                "Database is missing column orders.user_id. Apply Supabase migrations (see supabase/migrations/20260401000000_orders_user_id.sql), then retry.",
              code: "SCHEMA_OUTDATED",
            },
            { status: 503 }
          );
        }
        if (
          /fulfillment_type/i.test(blob) ||
          (/delivery_address/i.test(blob) && /orders/i.test(blob)) ||
          (/payment_method/i.test(blob) && /orders/i.test(blob))
        ) {
          return NextResponse.json(
            {
              error:
                "Database is missing checkout columns on orders. Apply Supabase migrations (see supabase/migrations/20260408000000_orders_checkout_fulfillment.sql), then retry.",
              code: "SCHEMA_OUTDATED",
            },
            { status: 503 }
          );
        }
        // Match previous behavior for ambiguous undefined-column / cache errors
        if (error.code === "42703" || /schema cache/i.test(blob)) {
          return NextResponse.json(
            {
              error:
                "Database is missing column orders.user_id. Apply Supabase migrations (see supabase/migrations/20260401000000_orders_user_id.sql), then retry.",
              code: "SCHEMA_OUTDATED",
            },
            { status: 503 }
          );
        }
      }
      throw error;
    }

    if (lastError) throw Object.assign(new Error(lastError.message), lastError);
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
