"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Candy, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getSafeNextPath } from "@/lib/auth-redirect";

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}

function SignUpContent() {
  const { signUp, signInWithOAuth, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const nextSafe = getSafeNextPath(searchParams.get("next"));
  const signInHref = nextSafe
    ? `/sign-in?next=${encodeURIComponent(nextSafe)}`
    : "/sign-in";

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const err = await signUp(email, password, fullName, phone);
    if (err) {
      setError(
        err === "adminPortal"
          ? t("adminAccountUseAdminSignIn")
          : t("signUpError")
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-rose-50 px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <Candy className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-stone-900">SweetDrop</span>
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-lg">
        <h1 className="mb-1 text-xl font-bold text-stone-900">
          {t("createAccount")}
        </h1>
        <p className="mb-6 text-sm text-stone-500">{t("signUp")}</p>

        <div className="flex flex-col gap-3 mb-5">
          <button
            type="button"
            onClick={() =>
              signInWithOAuth("google", { next: nextSafe })
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {t("continueWithGoogle")}
          </button>
          <button
            type="button"
            onClick={() =>
              signInWithOAuth("apple", { next: nextSafe })
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-900 py-2.5 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            {t("continueWithApple")}
          </button>
        </div>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-stone-400">{t("or")}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t("fullName")}
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("fullNamePlaceholder")}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t("phone")}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("phonePlaceholder2")}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("passwordPlaceholder")}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("signingUp")}
              </>
            ) : (
              t("createAccount")
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-stone-500">
          {t("alreadyHaveAccount")}{" "}
          <Link
            href={signInHref}
            className="font-semibold text-primary hover:text-primary-dark"
          >
            {t("signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
