"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { getSupabaseCustomerBrowser } from "@/lib/supabase-client-customer";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill email from logged-in user
  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = getSupabaseCustomerBrowser();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/auth/reset-password` }
    );

    setSubmitting(false);

    if (resetError) {
      setError(t("resetLinkError"));
      return;
    }
    setSent(true);
  }

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
          {sent ? (
            <div className="text-center">
              <p className="font-display text-lg font-semibold text-ink">
                {t("resetLinkSent")}
              </p>
              <Link
                href="/sign-in"
                className="mt-6 block text-sm font-semibold text-primary-dark hover:underline"
              >
                {t("signIn")}
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold text-ink">
                {t("forgotPasswordTitle")}
              </h1>
              <p className="mt-1 text-sm text-ink-soft">
                {t("forgotPasswordSubtitle")}
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {/* Hide email field if user is already logged in */}
                {!user && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                      {t("email")}
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("emailPlaceholder")}
                      className="input-premium"
                    />
                  </div>
                )}

                {user && (
                  <p className="text-sm text-ink-soft">
                    {t("email")}: <span className="font-medium text-ink">{user.email}</span>
                  </p>
                )}

                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary-solid w-full py-3.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("sendingResetLink")}
                    </>
                  ) : (
                    t("sendResetLink")
                  )}
                </button>
              </form>

              {!user && (
                <p className="mt-6 text-center text-sm text-ink-soft">
                  <Link
                    href="/sign-in"
                    className="font-semibold text-primary-dark hover:underline"
                  >
                    {t("signIn")}
                  </Link>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
