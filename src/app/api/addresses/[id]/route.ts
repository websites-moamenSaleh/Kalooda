import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireSession, isAuthorized } from "@/lib/require-role";
import { customerAddressPatchSchema } from "@/lib/customer-address-schema";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSession(req);
  if (!isAuthorized(authResult)) return authResult;
  const { userId } = authResult;
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = customerAddressPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid address update", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = { ...parsed.data };
    const merged = {
      label_type: parsed.data.label_type,
      custom_label: parsed.data.custom_label,
      city: parsed.data.city,
      street_line: parsed.data.street_line,
      building_number: parsed.data.building_number,
      formatted_address: parsed.data.formatted_address,
    };
    if (merged.label_type === "other") payload.label = merged.custom_label?.trim() || null;
    else if (merged.label_type === "home") payload.label = "Home";
    else if (merged.label_type === "work") payload.label = "Work";
    else if (merged.label_type === null) payload.label = null;

    if (
      merged.city !== undefined ||
      merged.street_line !== undefined ||
      merged.building_number !== undefined
    ) {
      payload.formatted_address =
        (typeof merged.formatted_address === "string" && merged.formatted_address.trim()) ||
        `${merged.city ?? ""}, ${merged.street_line ?? ""}, ${merged.building_number ?? ""}`;
    }

    const { data, error } = await supabaseAdmin
      .from("customer_addresses")
      .update(payload)
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error("Patch address error:", err);
    return NextResponse.json({ error: "Failed to update address" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSession(req);
  if (!isAuthorized(authResult)) return authResult;
  const { userId } = authResult;
  const { id } = await params;

  try {
    const { error } = await supabaseAdmin
      .from("customer_addresses")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete address error:", err);
    return NextResponse.json({ error: "Failed to delete address" }, { status: 500 });
  }
}
