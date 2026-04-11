import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireSession, isAuthorized } from "@/lib/require-role";

const MAX_ATTEMPTS = 3;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if (!isAuthorized(auth)) return auth;

  const body = (await req.json()) as { code?: string };
  const code = typeof body.code === "string" ? body.code.trim() : "";

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  const { data: record, error: fetchError } = await supabaseAdmin
    .from("phone_otp_codes")
    .select("id, code_hash, expires_at, attempts")
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (fetchError) {
    console.error("[otp/verify] fetch error:", fetchError);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  if (!record) {
    return NextResponse.json({ error: "no_otp" }, { status: 404 });
  }

  if (new Date(record.expires_at) < new Date()) {
    await supabaseAdmin.from("phone_otp_codes").delete().eq("user_id", auth.userId);
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await supabaseAdmin.from("phone_otp_codes").delete().eq("user_id", auth.userId);
    return NextResponse.json({ error: "max_attempts" }, { status: 429 });
  }

  if (hashCode(code) !== record.code_hash) {
    await supabaseAdmin
      .from("phone_otp_codes")
      .update({ attempts: record.attempts + 1 })
      .eq("id", record.id);

    const attemptsLeft = MAX_ATTEMPTS - (record.attempts + 1);
    return NextResponse.json({ error: "wrong_code", attemptsLeft }, { status: 422 });
  }

  // Code correct — mark phone verified and clean up
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ phone_verified: true })
    .eq("id", auth.userId);

  if (updateError) {
    console.error("[otp/verify] profile update error:", updateError);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  await supabaseAdmin.from("phone_otp_codes").delete().eq("user_id", auth.userId);

  return NextResponse.json({ verified: true });
}
