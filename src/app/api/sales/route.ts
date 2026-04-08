import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isAuthorized, requireRole } from "@/lib/require-role";

type SaleProductInput = {
  product_id: string;
  override_value?: number | null;
  override_type?: "amount" | "percentage" | null;
};

function isMissingSalesSchema(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string } | null)?.message ?? "";
  return code === "PGRST205" || /public\.sales/i.test(String(message));
}

function parseOverlapError(error: { message?: string; details?: string } | null): string | null {
  if (!error) return null;
  if (!/SALE_OVERLAP/i.test(error.message ?? "")) return null;
  const details = String(error.details ?? "");
  const pairs = details.split(";").map((entry) => entry.split("="));
  const data = new Map<string, string>();
  for (const [key, value] of pairs) {
    if (key) data.set(key.trim(), (value ?? "").trim());
  }
  const productName = data.get("product_name");
  if (productName) return `Product ${productName} is already scheduled for a sale during this time.`;
  return "One or more selected products are already scheduled for a sale during this time.";
}

function normalizeMappings(input: unknown): SaleProductInput[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => {
      const product_id =
        typeof (entry as { product_id?: unknown }).product_id === "string"
          ? ((entry as { product_id: string }).product_id || "").trim()
          : "";
      const override_value_raw = (entry as { override_value?: unknown }).override_value;
      const override_type_raw = (entry as { override_type?: unknown }).override_type;
      const override_value =
        override_value_raw === undefined || override_value_raw === null
          ? null
          : Number(override_value_raw);
      const override_type: SaleProductInput["override_type"] =
        override_type_raw === "amount" || override_type_raw === "percentage"
          ? override_type_raw
          : null;
      return { product_id, override_value, override_type };
    })
    .filter((entry) => entry.product_id.length > 0)
    .map((entry) => ({
      product_id: entry.product_id,
      override_value:
        entry.override_value === null || Number.isFinite(entry.override_value)
          ? entry.override_value
          : null,
      override_type: entry.override_type,
    }));
}

export async function GET(req: NextRequest) {
  const authResult = await requireRole(req, ["super_admin"]);
  if (!isAuthorized(authResult)) return authResult;

  const search = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  try {
    const { data, error } = await supabaseAdmin
      .from("sales")
      .select("*, sale_products(product_id, override_value, override_type, products(name, name_ar))")
      .order("start_at", { ascending: false });

    if (error) {
      if (isMissingSalesSchema(error)) {
        return NextResponse.json([]);
      }
      throw error;
    }

    const rows = (data ?? []).filter((sale) => {
      if (!search) return true;
      const haystack = `${sale.id} ${sale.name ?? ""}`.toLowerCase();
      return haystack.includes(search);
    });

    return NextResponse.json(rows);
  } catch (err) {
    console.error("Fetch sales error:", err);
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole(req, ["super_admin"]);
  if (!isAuthorized(authResult)) return authResult;
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const start_at = typeof body.start_at === "string" ? body.start_at : "";
    const end_at = typeof body.end_at === "string" ? body.end_at : "";
    const default_value = Number(body.default_value);
    const default_type =
      body.default_type === "amount" || body.default_type === "percentage"
        ? body.default_type
        : null;
    const mappings = normalizeMappings(body.products);

    if (!name || !start_at || !end_at || !default_type || !Number.isFinite(default_value)) {
      return NextResponse.json({ error: "Missing required sale fields" }, { status: 400 });
    }

    const { data: sale, error: saleError } = await supabaseAdmin
      .from("sales")
      .insert({ name, start_at, end_at, default_value, default_type })
      .select()
      .single();
    if (saleError) throw saleError;

    if (mappings.length > 0) {
      const { error: mappingError } = await supabaseAdmin.from("sale_products").insert(
        mappings.map((mapping) => ({
          sale_id: sale.id,
          product_id: mapping.product_id,
          override_value: mapping.override_value,
          override_type: mapping.override_type,
        }))
      );
      if (mappingError) {
        await supabaseAdmin.from("sales").delete().eq("id", sale.id);
        const friendly = parseOverlapError(mappingError);
        return NextResponse.json(
          { error: friendly ?? "Failed to assign products to sale" },
          { status: friendly ? 409 : 500 }
        );
      }
    }

    return NextResponse.json(sale, { status: 201 });
  } catch (err) {
    if (isMissingSalesSchema(err)) {
      return NextResponse.json(
        {
          error:
            "Sales is not available yet. Apply Supabase migrations, then reload the page.",
          code: "SCHEMA_OUTDATED",
        },
        { status: 503 }
      );
    }
    const friendly = parseOverlapError(err as { message?: string; details?: string });
    if (friendly) return NextResponse.json({ error: friendly }, { status: 409 });
    console.error("Create sale error:", err);
    return NextResponse.json({ error: "Failed to create sale" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authResult = await requireRole(req, ["super_admin"]);
  if (!isAuthorized(authResult)) return authResult;
  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "Sale id is required" }, { status: 400 });

    const update: Record<string, unknown> = {};
    if (typeof body.name === "string") update.name = body.name.trim();
    if (typeof body.start_at === "string") update.start_at = body.start_at;
    if (typeof body.end_at === "string") update.end_at = body.end_at;
    if (body.default_value !== undefined) update.default_value = Number(body.default_value);
    if (body.default_type === "amount" || body.default_type === "percentage") {
      update.default_type = body.default_type;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("sales")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (updateError) throw updateError;

    if (body.products !== undefined) {
      const mappings = normalizeMappings(body.products);
      const { error: clearError } = await supabaseAdmin
        .from("sale_products")
        .delete()
        .eq("sale_id", id);
      if (clearError) throw clearError;

      if (mappings.length > 0) {
        const { error: mappingError } = await supabaseAdmin.from("sale_products").insert(
          mappings.map((mapping) => ({
            sale_id: id,
            product_id: mapping.product_id,
            override_value: mapping.override_value,
            override_type: mapping.override_type,
          }))
        );
        if (mappingError) {
          const friendly = parseOverlapError(mappingError);
          return NextResponse.json(
            { error: friendly ?? "Failed to update sale products" },
            { status: friendly ? 409 : 500 }
          );
        }
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    if (isMissingSalesSchema(err)) {
      return NextResponse.json(
        {
          error:
            "Sales is not available yet. Apply Supabase migrations, then reload the page.",
          code: "SCHEMA_OUTDATED",
        },
        { status: 503 }
      );
    }
    const friendly = parseOverlapError(err as { message?: string; details?: string });
    if (friendly) return NextResponse.json({ error: friendly }, { status: 409 });
    console.error("Update sale error:", err);
    return NextResponse.json({ error: "Failed to update sale" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const authResult = await requireRole(req, ["super_admin"]);
  if (!isAuthorized(authResult)) return authResult;
  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "Sale id is required" }, { status: 400 });
    const endAt = typeof body.end_at === "string" ? body.end_at : new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("sales")
      .update({ end_at: endAt, ended_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    if (isMissingSalesSchema(err)) {
      return NextResponse.json(
        {
          error:
            "Sales is not available yet. Apply Supabase migrations, then reload the page.",
          code: "SCHEMA_OUTDATED",
        },
        { status: 503 }
      );
    }
    console.error("End sale error:", err);
    return NextResponse.json({ error: "Failed to end sale" }, { status: 500 });
  }
}
