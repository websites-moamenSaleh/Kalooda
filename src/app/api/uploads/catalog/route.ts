import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireRole, isAuthorized } from "@/lib/require-role";

const MAX_BYTES = 5 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const ALLOWED_FOLDERS = new Set(["categories", "products"]);

function extFromFileName(name: string): keyof typeof MIME_EXT | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return null;
}

function isBucketMissingError(message: string) {
  const m = message.toLowerCase();
  return m.includes("bucket not found");
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole(req, ["admin", "super_admin"]);
  if (!isAuthorized(authResult)) return authResult;

  let supabase: SupabaseClient;
  try {
    supabase = getSupabaseAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server misconfiguration";
    console.error("Catalog upload — admin client:", msg);
    return NextResponse.json(
      {
        error:
          "Server missing Supabase credentials. Set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local.",
      },
      { status: 503 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const folderRaw = formData.get("folder");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const folder =
      typeof folderRaw === "string" ? folderRaw.trim() : "";
    if (!ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json(
        { error: "Invalid folder (use categories or products)" },
        { status: 400 }
      );
    }

    let contentType = (file.type || "").trim().toLowerCase();
    if (!contentType || contentType === "application/octet-stream") {
      const guessed = extFromFileName(file.name);
      if (guessed) contentType = guessed;
    }
    const ext = MIME_EXT[contentType];
    if (!ext) {
      return NextResponse.json(
        { error: "Unsupported image type (use JPEG, PNG, WebP, or GIF)" },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }
    if (buf.length > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large (max 5 MB)" },
        { status: 413 }
      );
    }

    const path = `${folder}/${randomUUID()}.${ext}`;

    async function doUpload() {
      return supabase.storage.from("catalog").upload(path, buf, {
        contentType,
        upsert: false,
      });
    }

    let { error: uploadError } = await doUpload();

    if (uploadError && isBucketMissingError(uploadError.message)) {
      const { error: createErr } = await supabase.storage.createBucket(
        "catalog",
        { public: true }
      );
      if (
        createErr &&
        !/already exists|duplicate/i.test(createErr.message)
      ) {
        console.error("Create catalog bucket:", createErr);
        return NextResponse.json(
          {
            error: `Storage bucket "catalog" is missing. Run the migration supabase/migrations/20260402100000_catalog_storage_bucket.sql on your project (or create a public bucket named "catalog" in the Supabase dashboard). Details: ${createErr.message}`,
          },
          { status: 500 }
        );
      }
      ({ error: uploadError } = await doUpload());
    }

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: uploadError.message || "Upload failed" },
        { status: 500 }
      );
    }

    const { data: pub } = supabase.storage.from("catalog").getPublicUrl(path);

    const url = pub.publicUrl;
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Catalog upload error:", err);
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
