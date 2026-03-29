import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
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
  try {
    const body = await req.json();

    const { count } = await supabaseAdmin
      .from("orders")
      .select("*", { count: "exact", head: true });
    const displayId = `ORD-${7721 + (count ?? 0)}`;

    const { data, error } = await supabaseAdmin
      .from("orders")
      .insert({
        display_id: displayId,
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        items: body.items,
        total_price: body.total_price,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Create order error:", err);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
