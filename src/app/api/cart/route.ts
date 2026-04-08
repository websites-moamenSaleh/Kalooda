import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireSession, isAuthorized } from "@/lib/require-role";
import { mapProductRow } from "@/lib/map-product";
import type { CartItem } from "@/types/database";
import { applyEffectivePricing } from "@/lib/sale-pricing";

export async function GET(req: NextRequest) {
  const authResult = await requireSession(req);
  if (!isAuthorized(authResult)) return authResult;
  const { userId } = authResult;

  try {
    const { data: rows, error } = await supabaseAdmin
      .from("cart_items")
      .select("product_id, quantity")
      .eq("user_id", userId);

    if (error) throw error;

    const lineRows = rows ?? [];
    const productIds = [...new Set(lineRows.map((r) => r.product_id))];

    const productById = new Map<string, Record<string, unknown>>();
    if (productIds.length > 0) {
      const { data: products, error: pErr } = await supabaseAdmin
        .from("products")
        .select("*")
        .in("id", productIds);
      if (pErr) throw pErr;
      const pricedProducts = await applyEffectivePricing((products ?? []) as Array<{ id: string; price: number }>);
      for (const p of pricedProducts ?? []) {
        productById.set(String((p as { id: string }).id), p as Record<string, unknown>);
      }
    }

    const warnings: string[] = [];
    const items: CartItem[] = [];

    for (const row of lineRows) {
      const pr = productById.get(row.product_id);
      if (!pr) {
        warnings.push("removed_missing_product");
        continue;
      }
      if (pr.unavailable_today) {
        warnings.push(String(pr.name ?? "product_unavailable"));
        continue;
      }
      items.push({
        product: mapProductRow(pr),
        quantity: row.quantity,
      });
    }

    return NextResponse.json({ items, warnings });
  } catch (err) {
    console.error("GET /api/cart:", err);
    return NextResponse.json(
      { error: "Failed to load cart" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const authResult = await requireSession(req);
  if (!isAuthorized(authResult)) return authResult;
  const { userId } = authResult;

  try {
    const body = await req.json();
    const raw = Array.isArray(body.items) ? body.items : [];

    const normalized: { product_id: string; quantity: number }[] = [];
    for (const entry of raw) {
      const productId =
        typeof entry?.product_id === "string" ? entry.product_id.trim() : "";
      const q = Number(entry?.quantity);
      if (!productId || !Number.isFinite(q) || q <= 0) continue;
      normalized.push({ product_id: productId, quantity: Math.floor(q) });
    }

    const { error: delErr } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("user_id", userId);
    if (delErr) throw delErr;

    if (normalized.length > 0) {
      const { error: insErr } = await supabaseAdmin.from("cart_items").insert(
        normalized.map((x) => ({
          user_id: userId,
          product_id: x.product_id,
          quantity: x.quantity,
        }))
      );
      if (insErr) throw insErr;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/cart:", err);
    return NextResponse.json(
      { error: "Failed to save cart" },
      { status: 500 }
    );
  }
}
