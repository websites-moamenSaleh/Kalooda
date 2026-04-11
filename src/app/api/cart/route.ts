import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireSession, isAuthorized } from "@/lib/require-role";
import { mapProductRow } from "@/lib/map-product";
import type { CartItem, Product } from "@/types/database";
import { applyEffectivePricing } from "@/lib/sale-pricing";
import { normalizeCartLineOptions } from "@/lib/cart-line-options-normalize";
import { cartLineOptionsPersistedSchema } from "@/lib/product-options/validate-selections";

type PutLine = {
  line_id?: string;
  product_id: string;
  quantity: number;
  line_options?: unknown;
};

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}

export async function GET(req: NextRequest) {
  const authResult = await requireSession(req);
  if (!isAuthorized(authResult)) return authResult;
  const { userId } = authResult;

  try {
    const { data: rows, error } = await supabaseAdmin
      .from("cart_items")
      .select("id, product_id, quantity, line_options")
      .eq("user_id", userId);

    if (error) throw error;

    const lineRows = rows ?? [];
    const productIds = [...new Set(lineRows.map((r) => r.product_id as string))];

    const productById = new Map<string, Record<string, unknown>>();
    if (productIds.length > 0) {
      const { data: products, error: pErr } = await supabaseAdmin
        .from("products")
        .select("*")
        .in("id", productIds);
      if (pErr) throw pErr;
      const pricedProducts = await applyEffectivePricing(
        (products ?? []) as Array<{ id: string; price: number }>
      );
      for (const p of pricedProducts ?? []) {
        productById.set(String((p as { id: string }).id), p as Record<string, unknown>);
      }
    }

    const warnings: string[] = [];
    const items: CartItem[] = [];

    for (const row of lineRows) {
      const pr = productById.get(row.product_id as string);
      if (!pr) {
        warnings.push("removed_missing_product");
        continue;
      }
      if (pr.unavailable_today) {
        warnings.push(String(pr.name ?? "product_unavailable"));
        continue;
      }
      const product = mapProductRow(pr);
      const lineId = String((row as { id: string }).id);
      const normalized = normalizeCartLineOptions(
        (row as { line_options?: unknown }).line_options,
        product
      );
      items.push({
        lineId,
        product,
        quantity: Math.max(1, Math.floor(Number(row.quantity) || 0)),
        line_options: normalized,
      });
    }

    return NextResponse.json({ items, warnings });
  } catch (err) {
    console.error("GET /api/cart:", err);
    return NextResponse.json({ error: "Failed to load cart" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authResult = await requireSession(req);
  if (!isAuthorized(authResult)) return authResult;
  const { userId } = authResult;

  try {
    const body = await req.json();
    const raw = Array.isArray(body.items) ? body.items : [];

    const normalized: PutLine[] = [];
    for (const entry of raw) {
      const productId =
        typeof entry?.product_id === "string" ? entry.product_id.trim() : "";
      const q = Number(entry?.quantity);
      const lineId =
        typeof entry?.line_id === "string" && isUuid(entry.line_id)
          ? entry.line_id
          : undefined;
      if (!productId || !Number.isFinite(q) || q <= 0) continue;

      let line_options: unknown = entry?.line_options;
      if (line_options != null) {
        const parsed = cartLineOptionsPersistedSchema.safeParse(line_options);
        if (!parsed.success) {
          console.warn("PUT /api/cart: invalid line_options shape; coercing to empty snapshot", {
            product_id: productId,
            issues: parsed.error.flatten(),
          });
          line_options = { selections: {}, snapshot: { choice_lines: [], options_subtotal: 0, unit_price: 0 } };
        } else {
          line_options = parsed.data;
        }
      } else {
        line_options = { selections: {}, snapshot: { choice_lines: [], options_subtotal: 0, unit_price: 0 } };
      }

      normalized.push({
        line_id: lineId,
        product_id: productId,
        quantity: Math.floor(q),
        line_options,
      });
    }

    const { error: delErr } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("user_id", userId);
    if (delErr) throw delErr;

    if (normalized.length > 0) {
      const pids = [...new Set(normalized.map((n) => n.product_id))];
      const { data: prods, error: pFetchErr } = await supabaseAdmin
        .from("products")
        .select("*")
        .in("id", pids);
      if (pFetchErr) throw pFetchErr;
      const priced = await applyEffectivePricing((prods ?? []) as Product[]);
      const pmap = new Map(
        (priced ?? []).map((p) => [
          (p as { id: string }).id,
          mapProductRow(p as unknown as Record<string, unknown>),
        ])
      );

      const inserts = normalized.map((x) => {
        const product = pmap.get(x.product_id);
        const line_options = product
          ? normalizeCartLineOptions(x.line_options, product)
          : x.line_options;
        const row: Record<string, unknown> = {
          user_id: userId,
          product_id: x.product_id,
          quantity: x.quantity,
          line_options,
        };
        if (x.line_id) row.id = x.line_id;
        return row;
      });
      const { error: insErr } = await supabaseAdmin.from("cart_items").insert(inserts);
      if (insErr) throw insErr;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/cart:", err);
    return NextResponse.json({ error: "Failed to save cart" }, { status: 500 });
  }
}
