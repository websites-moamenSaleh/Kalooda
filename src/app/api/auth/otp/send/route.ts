import { NextRequest, NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireSession, isAuthorized } from "@/lib/require-role";
import { sendSms } from "@/lib/sms";

const OTP_TTL_SECONDS = 600; // 10 minutes
const RESEND_COOLDOWN_SECONDS = 60;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if (!isAuthorized(auth)) return auth;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("phone, phone_verified")
    .eq("id", auth.userId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (profile.phone_verified) {
    return NextResponse.json({ error: "Phone already verified" }, { status: 400 });
  }

  const phone = profile.phone?.trim() ?? "";
  if (!phone) {
    return NextResponse.json({ error: "No phone number on profile" }, { status: 400 });
  }

  // Enforce resend cooldown
  const { data: existing } = await supabaseAdmin
    .from("phone_otp_codes")
    .select("created_at")
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (existing) {
    const ageSeconds = (Date.now() - new Date(existing.created_at).getTime()) / 1000;
    if (ageSeconds < RESEND_COOLDOWN_SECONDS) {
      const remaining = Math.ceil(RESEND_COOLDOWN_SECONDS - ageSeconds);
      return NextResponse.json({ error: "resend_cooldown", remaining }, { status: 429 });
    }
  }

  // Generate 6-digit code, upsert (replaces any existing record for this user)
  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();

  const { error: upsertError } = await supabaseAdmin
    .from("phone_otp_codes")
    .upsert(
      {
        user_id: auth.userId,
        phone,
        code_hash: hashCode(code),
        expires_at: expiresAt,
        attempts: 0,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (upsertError) {
    console.error("[otp/send] upsert error:", upsertError);
    return NextResponse.json({ error: "Failed to store OTP" }, { status: 500 });
  }

  try {
    await sendSms(
      phone,
      `كود التحقق من كالودا: ${code}\nYour Kalooda verification code: ${code}`
    );
  } catch (err) {
    console.error("[otp/send] SMS error:", err);
    return NextResponse.json({ error: "Failed to send SMS" }, { status: 502 });
  }

  return NextResponse.json({ sent: true, cooldown: RESEND_COOLDOWN_SECONDS });
}
