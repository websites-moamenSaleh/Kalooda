import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireRole, isAuthorized } from "@/lib/require-role";
import {
  loadCategoryProductChoicesForOptions,
} from "@/lib/product-options/category-product-choices";
import type {
  CatalogOptionRow,
  OptionChoiceRow,
} from "@/lib/product-options/types";

const choiceInput = z.object({
  name_en: z.string().trim().min(1),
  name_ar: z.string().trim().nullable().optional(),
  price_markup: z.number().finite().default(0),
  vat_percentage: z.number().finite().nullable().optional(),
  pos_id: z.string().trim().nullable().optional(),
  is_default: z.boolean().optional(),
  is_enabled: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

const createBodySchema = z.object({
  type: z.enum(["single", "multiple"]),
  title_en: z.string().trim().min(1),
  title_ar: z.string().trim().nullable().optional(),
  choice_source: z.enum(["manual", "category_products"]).optional().default("manual"),
  source_category_id: z.string().uuid().nullable().optional(),
  show_to_courier: z.boolean().optional(),
  pos_id: z.string().trim().nullable().optional(),
  choices: z.array(choiceInput).optional().default([]),
});

export async function GET(req: NextRequest) {
  const authResult = await requireRole(req, ["super_admin"]);
  if (!isAuthorized(authResult)) return authResult;

  try {
    const { data: options, error: oErr } = await supabaseAdmin
      .from("options")
      .select("*")
      .order("title_en", { ascending: true });
    if (oErr) throw oErr;

    const optList = (options ?? []) as CatalogOptionRow[];
    const ids = optList
      .filter((option) => option.choice_source !== "category_products")
      .map((option) => option.id);
    let choices: OptionChoiceRow[] = [];
    if (ids.length > 0) {
      const { data: ch, error: cErr } = await supabaseAdmin
        .from("option_choices")
        .select("*")
        .in("option_id", ids)
        .order("sort_order", { ascending: true });
      if (cErr) throw cErr;
      choices = (ch ?? []) as OptionChoiceRow[];
    }
    choices = [
      ...choices,
      ...(await loadCategoryProductChoicesForOptions(optList)),
    ];

    return NextResponse.json({ options: optList, choices });
  } catch (err) {
    console.error("GET /api/admin/options:", err);
    return NextResponse.json({ error: "Failed to list options" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole(req, ["super_admin"]);
  if (!isAuthorized(authResult)) return authResult;

  try {
    const raw = await req.json();
    const parsed = createBodySchema.safeParse(raw);
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

    const { data: opt, error: insErr } = await supabaseAdmin
      .from("options")
      .insert({
        type: body.type,
        title_en: body.title_en,
        title_ar: body.title_ar?.trim() ?? null,
        choice_source: body.choice_source,
        source_category_id: isCategorySource ? body.source_category_id : null,
        show_to_courier: body.show_to_courier ?? false,
        pos_id: body.pos_id?.trim() || null,
      })
      .select()
      .single();
    if (insErr) throw insErr;

    const optionId = (opt as { id: string }).id;
    if (!isCategorySource && body.choices.length > 0) {
      const rows = body.choices.map((c, i) => ({
        option_id: optionId,
        name_en: c.name_en,
        name_ar: c.name_ar?.trim() ?? null,
        price_markup: c.price_markup,
        vat_percentage: c.vat_percentage ?? null,
        pos_id: c.pos_id?.trim() || null,
        is_default: c.is_default ?? false,
        is_enabled: c.is_enabled ?? true,
        sort_order: c.sort_order ?? i,
      }));
      const { error: chErr } = await supabaseAdmin.from("option_choices").insert(rows);
      if (chErr) throw chErr;
    }

    return NextResponse.json(opt, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/options:", err);
    return NextResponse.json({ error: "Failed to create option" }, { status: 500 });
  }
}
