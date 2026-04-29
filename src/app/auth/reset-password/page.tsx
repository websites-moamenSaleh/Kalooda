"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { getSupabaseCustomerBrowser } from "@/lib/supabase-client-customer";
import { useLanguage } from "@/contexts/language-context";

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseCustomerBrowser();

    // Parse hash fragment manually — Supabase implicit flow puts the token here.
    // The singleton client may have already consumed it before onAuthStateChange
    // is registered, so we read and apply it explicitly.
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (accessToken && refreshToken && type === "recovery") {
      const applySession = async () => {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          setInvalid(true);
        } else {
          setReady(true);
          window.history.replaceState(null, "", window.location.pathname);
        }
      };
      void applySession();
      return;
    }

    // PKCE flow: session already set by server-side callback — check for existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setReady(true);
        return;
      }

      // Fallback: listen for PASSWORD_RECOVERY event
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event: string) => {
          if (event === "PASSWORD_RECOVERY") setReady(true);
        }
      );

      // No session and no event — mark invalid after short delay
      const timeout = setTimeout(() => setInvalid(true), 2000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeout);
      };
    };

    void checkSession();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError(t("resetPasswordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("resetPasswordMismatch"));
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseCustomerBrowser();
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setSubmitting(false);

    if (updateError) {
      setError(t("resetPasswordError"));
      return;
    }

    setSuccess(true);
    setTimeout(() => router.replace("/sign-in"), 2500);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5f0e6] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Image
            src="/brand/logo-transparent.png"
            alt="Kalooda"
            width={160}
            height={82}
            className="brand-logo-outline h-10 w-auto object-contain"
            priority
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>

        <div className="surface-panel rounded-2xl border border-[#1F443C]/10 p-8 shadow-[var(--shadow-elevated)]">
          {invalid ? (
            <div className="text-center">
              <p className="font-display text-lg font-semibold text-ink">
                {t("resetPasswordInvalidLink")}
              </p>
            </div>
          ) : !ready ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : success ? (
            <div className="text-center">
              <p className="font-semibold text-primary-dark">
                {t("resetPasswordSuccess")}
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold text-ink">
                {t("resetPasswordTitle")}
              </h1>
              <p className="mt-1 text-sm text-ink-soft">
                {t("resetPasswordSubtitle")}
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">
                    {t("newPassword")}
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("newPasswordPlaceholder")}
                    required
                    className="w-full rounded-xl border border-[#1F443C]/15 bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-soft/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">
                    {t("confirmPassword")}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("confirmPasswordPlaceholder")}
                    required
                    className="w-full rounded-xl border border-[#1F443C]/15 bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-soft/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary-solid w-full py-3 disabled:opacity-50"
                >
                  {submitting ? t("resetPasswordSubmitting") : t("resetPasswordSubmit")}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
