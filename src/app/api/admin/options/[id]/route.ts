import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireRole, isAuthorized } from "@/lib/require-role";

const choicePatch = z.object({
  id: z.string().uuid().optional(),
  name_en: z.string().trim().min(1),
  name_ar: z.string().trim().nullable().optional(),
  price_markup: z.number().finite(),
  vat_percentage: z.number().finite().nullable().optional(),
  pos_id: z.string().trim().nullable().optional(),
  is_default: z.boolean().optional(),
  is_enabled: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

const patchBodySchema = z.object({
  type: z.enum(["single", "multiple"]).optional(),
  title_en: z.string().trim().min(1).optional(),
  title_ar: z.string().trim().nullable().optional(),
  choice_source: z.enum(["manual", "category_products"]).optional(),
  source_category_id: z.string().uuid().nullable().optional(),
  show_to_courier: z.boolean().optional(),
  pos_id: z.string().trim().nullable().optional(),
  choices: z.array(choicePatch).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(req, ["super_admin"]);
  if (!isAuthorized(authResult)) return authResult;
  const { id: optionId } = await params;

  try {
    const raw = await req.json();
    const parsed = patchBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;
    const isCategorySource = body.choice_source === "category_products";
    if (isCategorySource && !body.source_category_id) {
      return NextResponse.json(
        { error: "source_category_id is required for category product choices" },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {};
    if (body.type !== undefined) update.type = body.type;
    if (body.title_en !== undefined) update.title_en = body.title_en;
    if (body.title_ar !== undefined) update.title_ar = body.title_ar?.trim() ?? null;
    if (body.choice_source !== undefined) {
      update.choice_source = body.choice_source;
      update.source_category_id = isCategorySource ? body.source_category_id : null;
    } else if (body.source_category_id !== undefined) {
      update.source_category_id = body.source_category_id;
    }
    if (body.show_to_courier !== undefined) update.show_to_courier = body.show_to_courier;
    if (body.pos_id !== undefined) update.pos_id = body.pos_id?.trim() || null;
    update.updated_at = new Date().toISOString();

    if (Object.keys(update).length > 1) {
      const { error: uErr } = await supabaseAdmin
        .from("options")
        .update(update)
        .eq("id", optionId);
      if (uErr) throw uErr;
    }

    if (isCategorySource) {
      const { error: dErr } = await supabaseAdmin
        .from("option_choices")
        .delete()
        .eq("option_id", optionId);
      if (dErr) throw dErr;
    } else if (body.choices) {
      const { data: existing, error: exErr } = await supabaseAdmin
        .from("option_choices")
        .select("id")
        .eq("option_id", optionId);
      if (exErr) throw exErr;
      const existingIds = new Set((existing ?? []).map((r) => (r as { id: string }).id));
      const keepIds = new Set(body.choices.map((c) => c.id).filter(Boolean) as string[]);
      const toDelete = [...existingIds].filter((eid) => !keepIds.has(eid));
      if (toDelete.length > 0) {
        const { error: dErr } = await supabaseAdmin
          .from("option_choices")
          .delete()
          .in("id", toDelete);
        if (dErr) throw dErr;
      }

      for (let i = 0; i < body.choices.length; i++) {
        const c = body.choices[i];
        const row = {
          option_id: optionId,
          name_en: c.name_en,
          name_ar: c.name_ar?.trim() ?? null,
          price_markup: c.price_markup,
          vat_percentage: c.vat_percentage ?? null,
          pos_id: c.pos_id?.trim() || null,
          is_default: c.is_default ?? false,
          is_enabled: c.is_enabled ?? true,
          sort_order: c.sort_order ?? i,
        };
        if (c.id && existingIds.has(c.id)) {
          const { error: upErr } = await supabaseAdmin
            .from("option_choices")
            .update(row)
            .eq("id", c.id);
          if (upErr) throw upErr;
        } else {
          const { error: inErr } = await supabaseAdmin.from("option_choices").insert(row);
          if (inErr) throw inErr;
        }
      }
    }

    const { data: opt, error: gErr } = await supabaseAdmin
      .from("options")
      .select("*")
      .eq("id", optionId)
      .single();
    if (gErr) throw gErr;

    return NextResponse.json(opt);
  } catch (err) {
    console.error("PATCH /api/admin/options/[id]:", err);
    return NextResponse.json({ error: "Failed to update option" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(req, ["super_admin"]);
  if (!isAuthorized(authResult)) return authResult;
  const { id: optionId } = await params;

  try {
    const { error } = await supabaseAdmin.from("options").delete().eq("id", optionId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/options/[id]:", err);
    return NextResponse.json({ error: "Failed to delete option" }, { status: 500 });
  }
}
