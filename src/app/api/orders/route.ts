import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireRole, requireSession, isAuthorized } from "@/lib/require-role";
import {
  createOrderBodySchema,
  ORDER_VALIDATION_ERROR,
} from "@/lib/order-create-body";
import {
  coordinateSchema,
  isLocationInDeliveryZone,
} from "@/lib/geofencing/validate-zone";
import { getActiveSalePricingByProductIds } from "@/lib/sale-pricing";
import { loadProductOptionsBundlesByProductIds } from "@/lib/load-product-options-bundle";
import { validateAndBuildOrderLine } from "@/lib/validate-order-line-options";

const ORD_PREFIX = /^ORD-(\d+)$/;
const DELIVERY_ZONE_BLOCKED_MESSAGE =
  "We don't deliver to this location yet / نحن لا نوصل لهذا الموقع بعد";

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

async function geocodePlaceIdToCoordinates(placeId: string) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) return null;

  const payload = (await res.json()) as {
    status?: string;
    results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
  };
  if (payload.status !== "OK" || !payload.results?.[0]?.geometry?.location) {
    return null;
  }

  const location = payload.results[0].geometry.location;
  const parsed = coordinateSchema.safeParse({
    lat: Number(location.lat),
    lng: Number(location.lng),
  });
  if (!parsed.success) return null;

  return parsed.data;
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

    if (body.customer_address_id) {
      const { data: selectedAddress, error: addressError } = await supabaseAdmin
        .from("customer_addresses")
        .select(
          "id, user_id, city, street_line, building_number, formatted_address, latitude, longitude"
        )
        .eq("id", body.customer_address_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (addressError) throw addressError;
      if (!selectedAddress) {
        return NextResponse.json(
          { error: "Selected address is invalid", code: ORDER_VALIDATION_ERROR },
          { status: 400 }
        );
      }
      const normalizedAddress =
        selectedAddress.formatted_address ||
        `${selectedAddress.city}, ${selectedAddress.street_line}, ${selectedAddress.building_number}`;
      body.delivery_address = normalizedAddress;
      body.delivery_formatted_address = normalizedAddress;
      body.delivery_latitude =
        selectedAddress.latitude != null ? Number(selectedAddress.latitude) : null;
      body.delivery_longitude =
        selectedAddress.longitude != null ? Number(selectedAddress.longitude) : null;
    }

    if (body.fulfillment_type === "delivery") {
      let coords = coordinateSchema.safeParse({
        lat: body.delivery_latitude,
        lng: body.delivery_longitude,
      });

      if (!coords.success && body.delivery_place_id) {
        const resolved = await geocodePlaceIdToCoordinates(body.delivery_place_id);
        if (resolved) {
          body.delivery_latitude = resolved.lat;
          body.delivery_longitude = resolved.lng;
          coords = coordinateSchema.safeParse(resolved);
        }
      }

      if (!coords.success) {
        return NextResponse.json(
          {
            error: "Delivery coordinates are required",
            code: ORDER_VALIDATION_ERROR,
            detail: "MISSING_DELIVERY_COORDINATES",
          },
          { status: 400 }
        );
      }

      const inDeliveryZone = await isLocationInDeliveryZone(
        coords.data.lat,
        coords.data.lng
      );
      if (!inDeliveryZone) {
        return NextResponse.json(
          {
            error: DELIVERY_ZONE_BLOCKED_MESSAGE,
            code: "DELIVERY_ZONE_OUT_OF_RANGE",
          },
          { status: 400 }
        );
      }
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("full_name, phone, phone_verified")
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

    // Temporarily disabled by request: allow checkout even when phone is unverified.
    // Keep this block easy to restore when verification gating is re-enabled.

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

    const productIds = [...new Set(body.items.map((item) => item.product_id))];
    const { data: productRows, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, name, name_ar, price, image_url")
      .in("id", productIds);
    if (productError) throw productError;

    const productMap = new Map(
      (productRows ?? []).map((row) => [String(row.id), row])
    );
    const saleMap = await getActiveSalePricingByProductIds(productIds);
    const optionBundlesByProductId =
      await loadProductOptionsBundlesByProductIds(productIds);

    const normalizedItems = [];
    for (const item of body.items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        return NextResponse.json(
          {
            error: "Invalid product in order",
            code: ORDER_VALIDATION_ERROR,
            detail: "MISSING_PRODUCT",
          },
          { status: 400 }
        );
      }
      const sale = saleMap.get(item.product_id);
      try {
        normalizedItems.push(
          await validateAndBuildOrderLine(
            item,
            {
              name: String(product.name ?? ""),
              name_ar: product.name_ar ? String(product.name_ar) : null,
              price: Number(product.price) || 0,
              image_url: product.image_url
                ? String(product.image_url)
                : null,
            },
            sale
              ? {
                  discount_type: sale.discount_type,
                  discount_value: sale.discount_value,
                }
              : undefined,
            optionBundlesByProductId.get(item.product_id)
          )
        );
      } catch (e) {
        const err = e as Error & { code?: string };
        return NextResponse.json(
          {
            error: err.message || "Order line validation failed",
            code: ORDER_VALIDATION_ERROR,
            detail: err.code ?? "ORDER_LINE",
          },
          { status: 400 }
        );
      }
    }
    const normalizedTotal = Math.round(
      normalizedItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0) * 100
    ) / 100;

    let lastError: { code?: string; message: string; details?: string; hint?: string } | null = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const displayId = await nextOrderDisplayId();

      const insertResult = await supabaseAdmin
        .from("orders")
        .insert({
          display_id: displayId,
          user_id: userId,
          customer_name: customerName,
          customer_phone: customerPhone,
          items: normalizedItems,
          total_price: normalizedTotal,
          status: "pending",
          fulfillment_type: body.fulfillment_type,
          delivery_address: body.delivery_address,
          customer_address_id: body.customer_address_id,
          delivery_latitude: body.delivery_latitude,
          delivery_longitude: body.delivery_longitude,
          delivery_formatted_address: body.delivery_formatted_address,
          payment_method: body.payment_method,
          delivery_token_expires_at:
            body.fulfillment_type === "delivery"
              ? new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
              : null,
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
    if ((err as { code?: string }).code === "MISSING_PRODUCT") {
      return NextResponse.json(
        { error: "One or more products in your cart are no longer available." },
        { status: 400 }
      );
    }
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
