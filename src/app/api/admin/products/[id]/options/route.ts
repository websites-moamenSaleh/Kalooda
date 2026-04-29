import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireRole, isAuthorized } from "@/lib/require-role";

const attachBodySchema = z.object({
  option_id: z.string().uuid(),
  sort_order: z.number().int().optional(),
  min_select: z.number().int().min(0).optional(),
  max_select: z.number().int().min(1).optional(),
  items_free: z.number().int().min(0).optional(),
  hidden_conditional: z.any().nullable().optional(),
  display_name_en: z.string().trim().nullable().optional(),
  display_name_ar: z.string().trim().nullable().optional(),
  pos_id: z.string().trim().nullable().optional(),
});

const reorderBodySchema = z.object({
  order: z.array(
    z.object({
      option_id: z.string().uuid(),
      sort_order: z.number().int(),
    })
  ),
});

const junctionUpdateSchema = z.object({
  option_id: z.string().uuid(),
  sort_order: z.number().int().optional(),
  min_select: z.number().int().min(0).optional(),
  max_select: z.number().int().min(1).optional(),
  items_free: z.number().int().min(0).optional(),
  hidden_conditional: z.any().nullable().optional(),
  display_name_en: z.string().trim().nullable().optional(),
  display_name_ar: z.string().trim().nullable().optional(),
  pos_id: z.string().trim().nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(req, ["super_admin"]);
  if (!isAuthorized(authResult)) return authResult;
  const { id: productId } = await params;

  try {
    const { data: junctions, error } = await supabaseAdmin
      .from("product_options_junction")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ junctions: junctions ?? [] });
  } catch (err) {
    console.error("GET /api/admin/products/[id]/options:", err);
    return NextResponse.json({ error: "Failed to load junctions" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(req, ["super_admin"]);
  if (!isAuthorized(authResult)) return authResult;
  const { id: productId } = await params;

  try {
    const raw = await req.json();
    const parsed = attachBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const b = parsed.data;

    const { data: optRow, error: oErr } = await supabaseAdmin
      .from("options")
      .select("id, type")
      .eq("id", b.option_id)
      .maybeSingle();
    if (oErr || !optRow) {
      return NextResponse.json({ error: "Option not found" }, { status: 404 });
    }
    const isMultiple = (optRow as { type?: string }).type === "multiple";

    const { count } = await supabaseAdmin
      .from("product_options_junction")
      .select("*", { count: "exact", head: true })
      .eq("product_id", productId);

    const nextSort = typeof b.sort_order === "number" ? b.sort_order : (count ?? 0);

    const defaultMin = isMultiple ? 0 : 1;
    const defaultMax = isMultiple ? 50 : 1;

    const { data: junction, error: jErr } = await supabaseAdmin
      .from("product_options_junction")
      .insert({
        product_id: productId,
        option_id: b.option_id,
        sort_order: nextSort,
        min_select: b.min_select ?? defaultMin,
        max_select: b.max_select ?? defaultMax,
        items_free: b.items_free ?? 0,
        hidden_conditional: b.hidden_conditional ?? null,
        display_name_en: b.display_name_en?.trim() || null,
        display_name_ar: b.display_name_ar?.trim() || null,
        pos_id: b.pos_id?.trim() || null,
      })
      .select()
      .single();

    if (jErr) {
      if (String(jErr.message).includes("duplicate") || jErr.code === "23505") {
        return NextResponse.json({ error: "Option already attached" }, { status: 409 });
      }
      throw jErr;
    }

    return NextResponse.json(junction, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/products/[id]/options:", err);
    return NextResponse.json({ error: "Failed to attach option" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(req, ["super_admin"]);
  if (!isAuthorized(authResult)) return authResult;
  const { id: productId } = await params;

  try {
    const raw = await req.json();
    const reorderParsed = reorderBodySchema.safeParse(raw);
    if (reorderParsed.success) {
      for (const row of reorderParsed.data.order) {
        const { error } = await supabaseAdmin
          .from("product_options_junction")
          .update({ sort_order: row.sort_order })
          .eq("product_id", productId)
          .eq("option_id", row.option_id);
        if (error) throw error;
      }
      return NextResponse.json({ ok: true });
    }

    const junctionParsed = junctionUpdateSchema.safeParse(raw);
    if (junctionParsed.success) {
      const { option_id, ...fields } = junctionParsed.data;
      const update: Record<string, unknown> = {};
      if (fields.sort_order !== undefined) update.sort_order = fields.sort_order;
      if (fields.min_select !== undefined) update.min_select = fields.min_select;
      if (fields.max_select !== undefined) update.max_select = fields.max_select;
      if (fields.items_free !== undefined) update.items_free = fields.items_free;
      if (fields.hidden_conditional !== undefined)
        update.hidden_conditional = fields.hidden_conditional;
      if (fields.display_name_en !== undefined)
        update.display_name_en = fields.display_name_en?.trim() || null;
      if (fields.display_name_ar !== undefined)
        update.display_name_ar = fields.display_name_ar?.trim() || null;
      if (fields.pos_id !== undefined) update.pos_id = fields.pos_id?.trim() || null;

      if (Object.keys(update).length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from("product_options_junction")
        .update(update)
        .eq("product_id", productId)
        .eq("option_id", option_id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      {
        error: "Invalid body",
        issues: {
          reorder: reorderParsed.success ? null : reorderParsed.error.flatten(),
          junction: junctionParsed.success ? null : junctionParsed.error.flatten(),
        },
      },
      { status: 400 }
    );
  } catch (err) {
    console.error("PATCH /api/admin/products/[id]/options:", err);
    return NextResponse.json({ error: "Failed to reorder" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(req, ["super_admin"]);
  if (!isAuthorized(authResult)) return authResult;
  const { id: productId } = await params;
  const optionId = req.nextUrl.searchParams.get("option_id");
  if (!optionId) {
    return NextResponse.json({ error: "option_id required" }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin
      .from("product_options_junction")
      .delete()
      .eq("product_id", productId)
      .eq("option_id", optionId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/products/[id]/options:", err);
    return NextResponse.json({ error: "Failed to detach" }, { status: 500 });
  }
}
