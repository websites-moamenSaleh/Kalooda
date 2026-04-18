import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { loadProductOptionsBundleByProductId } from "@/lib/load-product-options-bundle";
import type { OptionChoiceRow } from "@/lib/product-options/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;

  // SENTRY TEST — remove after confirming error capture in production
  if (productId === "sentry-test") {
    throw new Error("Sentry test error — intentional, safe to resolve");
  }

  const { data: product, error: pErr } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();

  if (pErr || !product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const bundle = await loadProductOptionsBundleByProductId(productId);
  const options = [...bundle.optionsById.values()];
  const choicesRaw = [...bundle.choicesByOptionId.values()].flat();
  const choices: OptionChoiceRow[] = choicesRaw.filter((c) => c.is_enabled);

  return NextResponse.json({
    junctions: bundle.junctions,
    options,
    choices,
  });
}
