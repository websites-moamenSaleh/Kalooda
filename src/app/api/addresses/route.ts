import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireSession, isAuthorized } from "@/lib/require-role";
import {
  customerAddressSchema,
  CUSTOMER_ADDRESS_LIMIT,
} from "@/lib/customer-address-schema";

export async function GET(req: NextRequest) {
  const authResult = await requireSession(req);
  if (!isAuthorized(authResult)) return authResult;

  const { userId } = authResult;

  try {
    const { data, error } = await supabaseAdmin
      .from("customer_addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("List addresses error:", err);
    return NextResponse.json({ error: "Failed to fetch addresses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireSession(req);
  if (!isAuthorized(authResult)) return authResult;
  const { userId } = authResult;

  try {
    const body = await req.json();
    const parsed = customerAddressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid address", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { count, error: countError } = await supabaseAdmin
      .from("customer_addresses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (countError) throw countError;
    if ((count ?? 0) >= CUSTOMER_ADDRESS_LIMIT) {
      return NextResponse.json(
        { error: "Address limit reached", code: "ADDRESS_LIMIT_REACHED" },
        { status: 400 }
      );
    }

    const label =
      parsed.data.label_type === "other"
        ? (parsed.data.custom_label?.trim() || null)
        : parsed.data.label_type === "home"
          ? "Home"
          : parsed.data.label_type === "work"
            ? "Work"
            : null;
    const formattedAddress =
      parsed.data.formatted_address?.trim() ||
      `${parsed.data.city}, ${parsed.data.street_line}, ${parsed.data.building_number}`;

    const { data, error } = await supabaseAdmin
      .from("customer_addresses")
      .insert({
        user_id: userId,
        ...parsed.data,
        label,
        formatted_address: formattedAddress,
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (/ADDRESS_LIMIT_REACHED/i.test(msg)) {
      return NextResponse.json(
        { error: "Address limit reached", code: "ADDRESS_LIMIT_REACHED" },
        { status: 400 }
      );
    }
    console.error("Create address error:", err);
    return NextResponse.json({ error: "Failed to create address" }, { status: 500 });
  }
}
