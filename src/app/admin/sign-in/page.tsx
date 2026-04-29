"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAdminAuth } from "@/contexts/admin-auth-context";
import { useLanguage } from "@/contexts/language-context";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function AdminSignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center admin-canvas">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
        </div>
      }
    >
      <AdminSignInContent />
    </Suspense>
  );
}

function AdminSignInContent() {
  const { signIn, loading: authLoading } = useAdminAuth();
  const { t } = useLanguage();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const urlError = (() => {
    const e = searchParams.get("error");
    if (e === "oauth") return t("oauthError");
    if (e === "forbidden") return t("adminSignInNoAccess");
    return null;
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const err = await signIn(email, password);
    if (err) {
      setError(err === "forbidden" ? t("adminSignInNoAccess") : err);
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center admin-canvas">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center admin-canvas px-4 py-10">
      <div className="mb-10 flex items-center gap-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/brand/logo-transparent.png"
            alt="Kalooda"
            width={160}
            height={82}
            className="brand-logo-outline h-10 w-auto object-contain"
            priority
          />
        </Link>
        <LanguageSwitcher className="flex items-center gap-1.5 rounded-lg border border-admin-border bg-admin-panel px-3 py-2 text-sm font-medium text-admin-muted transition-colors hover:border-primary/40 hover:text-admin-ink" />
      </div>

      <div className="admin-panel w-full max-w-md rounded-xl border border-admin-border p-8 shadow-sm">
        <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <span className="text-xs font-bold text-primary-dark">Ops</span>
        </div>
        <h1 className="mt-4 text-xl font-bold text-admin-ink">
          {t("adminSignInTitle")}
        </h1>
        <p className="mt-1 text-sm text-admin-muted">{t("adminSignInSubtitle")}</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-admin-muted">
              {t("email")}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className="admin-input"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-admin-muted">
              {t("password")}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("passwordPlaceholder")}
              className="admin-input"
            />
          </div>

          {(error ?? urlError) && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error ?? urlError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0A2923] py-3 text-sm font-bold text-[#FFEC94] shadow-sm transition-colors hover:bg-[#082018] disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("signingIn")}
              </>
            ) : (
              t("signIn")
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-admin-muted">
          <Link
            href="/sign-in"
            className="font-semibold text-primary-dark hover:underline"
          >
            {t("adminSignInCustomerLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
