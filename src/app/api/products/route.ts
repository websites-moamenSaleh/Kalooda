import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireRole, isAuthorized } from "@/lib/require-role";
import { broadcastStorefrontCatalog } from "@/lib/storefront-catalog-broadcast";
import type { Product } from "@/types/database";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .order("name");

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("Fetch products error:", err);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole(req, ["admin", "super_admin"]);
  if (!isAuthorized(authResult)) return authResult;

  try {
    const body = await req.json();
    const {
      name,
      name_ar,
      description,
      description_ar,
      price,
      stock_quantity,
      ingredients,
      ingredients_ar,
      allergens,
      image_url,
      category_id,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("products")
      .insert({
        name: name.trim(),
        name_ar: name_ar?.trim() || null,
        description: description?.trim() || null,
        description_ar: description_ar?.trim() || null,
        price: Number(price) || 0,
        stock_quantity: Number(stock_quantity) || 0,
        ingredients: ingredients?.trim() || null,
        ingredients_ar: ingredients_ar?.trim() || null,
        allergens: allergens ?? [],
        image_url: image_url?.trim() || null,
        category_id: category_id || null,
      })
      .select()
      .single();

    if (error) throw error;
    void broadcastStorefrontCatalog({
      action: "INSERT",
      product: data as Product,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Create product error:", err);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const authResult = await requireRole(req, ["admin", "super_admin"]);
  if (!isAuthorized(authResult)) return authResult;

  try {
    const body = await req.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Product id is required" },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {};
    if (fields.name !== undefined) update.name = fields.name.trim();
    if (fields.name_ar !== undefined)
      update.name_ar = fields.name_ar?.trim() || null;
    if (fields.description !== undefined)
      update.description = fields.description?.trim() || null;
    if (fields.description_ar !== undefined)
      update.description_ar = fields.description_ar?.trim() || null;
    if (fields.price !== undefined) update.price = Number(fields.price) || 0;
    if (fields.stock_quantity !== undefined)
      update.stock_quantity = Number(fields.stock_quantity) || 0;
    if (fields.ingredients !== undefined)
      update.ingredients = fields.ingredients?.trim() || null;
    if (fields.ingredients_ar !== undefined)
      update.ingredients_ar = fields.ingredients_ar?.trim() || null;
    if (fields.allergens !== undefined) update.allergens = fields.allergens;
    if (fields.image_url !== undefined)
      update.image_url = fields.image_url?.trim() || null;
    if (fields.category_id !== undefined)
      update.category_id = fields.category_id || null;

    const { data, error } = await supabaseAdmin
      .from("products")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    void broadcastStorefrontCatalog({
      action: "UPDATE",
      product: data as Product,
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error("Update product error:", err);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const authResult = await requireRole(req, ["admin", "super_admin"]);
  if (!isAuthorized(authResult)) return authResult;

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Product id is required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;
    void broadcastStorefrontCatalog({ action: "DELETE", id });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete product error:", err);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
