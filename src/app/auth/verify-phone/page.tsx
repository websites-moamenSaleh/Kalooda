"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import { getSafeNextPath } from "@/lib/auth-redirect";

const RESEND_COOLDOWN = 60;

export default function VerifyPhonePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyPhoneContent />
    </Suspense>
  );
}

function VerifyPhoneContent() {
  const { t } = useLanguage();
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeNextPath(searchParams.get("next")) ?? "/";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCooldown(seconds: number) {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function sendOtp() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp/send", { method: "POST" });
      const data = (await res.json()) as {
        sent?: boolean;
        cooldown?: number;
        remaining?: number;
        error?: string;
      };

      if (res.status === 429 && data.remaining) {
        startCooldown(data.remaining);
        return;
      }
      if (!res.ok) {
        setError(t("verifyPhoneErrorSendFailed"));
        return;
      }
      startCooldown(data.cooldown ?? RESEND_COOLDOWN);
    } catch {
      setError(t("verifyPhoneErrorSendFailed"));
    } finally {
      setSending(false);
    }
  }

  // Auto-send on mount
  useEffect(() => {
    void sendOtp();
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError(t("verifyPhoneErrorInvalidCode"));
      return;
    }
    setError(null);
    setVerifying(true);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as {
        verified?: boolean;
        error?: string;
        attemptsLeft?: number;
      };

      if (data.verified) {
        setVerified(true);
        await refreshProfile();
        setTimeout(() => router.push(nextPath), 1200);
        return;
      }

      switch (data.error) {
        case "wrong_code":
          setError(
            typeof data.attemptsLeft === "number" && data.attemptsLeft > 0
              ? `${t("verifyPhoneErrorWrongCode")} ${data.attemptsLeft} ${t("verifyPhoneErrorWrongCodeAttemptsLeft")}`
              : t("verifyPhoneErrorWrongCode")
          );
          break;
        case "expired":
          setError(t("verifyPhoneErrorExpired"));
          break;
        case "max_attempts":
          setError(t("verifyPhoneErrorMaxAttempts"));
          break;
        case "no_otp":
          setError(t("verifyPhoneErrorNoOtp"));
          break;
        default:
          setError(t("verifyPhoneErrorGeneric"));
      }
    } catch {
      setError(t("verifyPhoneErrorGeneric"));
    } finally {
      setVerifying(false);
    }
  }

  const phone = profile?.phone ?? "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5f0e6] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Image
              src="/brand/logo-transparent.png"
              alt="Kalooda"
              width={160}
              height={82}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>
        </div>

        <div className="surface-panel rounded-2xl border border-[#1F443C]/10 p-8 shadow-[var(--shadow-elevated)]">
          {verified ? (
            <div className="text-center">
              <p className="font-display text-lg font-semibold text-primary-dark">
                {t("verifyPhoneSuccess")}
              </p>
              <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold text-ink">
                {t("verifyPhoneTitle")}
              </h1>
              {phone && (
                <p className="mt-1 text-sm text-ink-soft">
                  {t("verifyPhoneSubtitle")}{" "}
                  <span className="font-medium text-ink">{phone}</span>
                </p>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    {t("verifyPhoneInputLabel")}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder={t("verifyPhoneInputPlaceholder")}
                    className="input-premium tracking-[0.4em]"
                    autoComplete="one-time-code"
                  />
                </div>

                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={verifying || code.length !== 6}
                  className="btn-primary-solid w-full py-3.5 disabled:opacity-50"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("verifyPhoneVerifying")}
                    </>
                  ) : (
                    t("verifyPhoneSubmit")
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                {cooldown > 0 ? (
                  <p className="text-sm text-ink-soft">
                    {t("verifyPhoneResendIn")} {cooldown}s
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={sending}
                    className="text-sm font-semibold text-primary-dark hover:underline disabled:opacity-50"
                  >
                    {sending ? t("verifyPhoneResending") : t("verifyPhoneResend")}
                  </button>
                )}
              </div>

              <div className="mt-6 text-center">
                <Link
                  href={nextPath}
                  className="text-sm text-ink-soft hover:underline"
                >
                  {t("verifyPhoneSkip")}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
