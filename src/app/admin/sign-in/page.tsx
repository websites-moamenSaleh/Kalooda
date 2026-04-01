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
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      setError(
        err === "forbidden" ? t("adminSignInNoAccess") : err
      );
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-100 px-4">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/brand/logo-transparent.png"
            alt="Kalooda"
            width={140}
            height={72}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>
        <LanguageSwitcher className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-200 transition-colors" />
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-lg">
        <h1 className="mb-1 text-xl font-bold text-stone-900">
          {t("adminSignInTitle")}
        </h1>
        <p className="mb-6 text-sm text-stone-500">{t("adminSignInSubtitle")}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t("email")}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t("password")}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("passwordPlaceholder")}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {(error ?? urlError) && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error ?? urlError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1F443C] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#163530] transition-colors disabled:opacity-50"
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

        <p className="mt-5 text-center text-sm text-stone-500">
          <Link
            href="/sign-in"
            className="font-semibold text-[#1F443C] hover:text-[#163530]"
          >
            {t("adminSignInCustomerLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
