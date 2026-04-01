"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getSafeNextPath } from "@/lib/auth-redirect";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}

function SignInContent() {
  const { signIn, signInWithOAuth, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const nextSafe = getSafeNextPath(searchParams.get("next"));
  const signUpHref = nextSafe
    ? `/sign-up?next=${encodeURIComponent(nextSafe)}`
    : "/sign-up";
  const confirmEmail = searchParams.get("message") === "confirm-email";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const urlError = (() => {
    const e = searchParams.get("error");
    if (e === "oauth") return t("oauthError");
    if (e === "adminPortal") return t("adminAccountUseAdminSignIn");
    return null;
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const err = await signIn(email, password);
    if (err) {
      setError(
        err === "adminPortal"
          ? t("adminAccountUseAdminSignIn")
          : t("signInError")
      );
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:grid-cols-[minmax(0,1.15fr)_minmax(0,24rem)]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0A2923] via-[#123A33] to-[#082018] px-10 py-12 lg:flex xl:px-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, rgba(211, 169, 76,0.25), transparent 45%),
              radial-gradient(circle at 80% 60%, rgba(92,40,52,0.2), transparent 40%)`,
          }}
        />
        <Link href="/" className="relative z-10 inline-flex w-fit items-center gap-3">
          <Image
            src="/brand/logo-transparent.png"
            alt="Kalooda"
            width={180}
            height={92}
            className="h-12 w-auto object-contain"
            priority
          />
        </Link>
        <div className="relative z-10 max-w-md">
          <p className="font-display text-3xl font-semibold leading-tight text-[#F0F5F3] xl:text-4xl">
            {t("welcomeBack")}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[#A8B5AD]">
            {t("heroSubtitle")}
          </p>
        </div>
        <p className="relative z-10 text-xs uppercase tracking-[0.2em] text-[#D3A94C]/70">
          {t("promoRibbon")}
        </p>
      </div>

      <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="mb-8 flex w-full max-w-sm items-center justify-between lg:hidden">
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
          <LanguageSwitcher className="flex items-center gap-1.5 rounded-lg border border-[#1F443C]/12 bg-white/80 px-3 py-2 text-sm font-medium text-ink-soft hover:border-[#D3A94C]/35" />
        </div>

        <div className="surface-panel w-full max-w-sm rounded-2xl border border-[#1F443C]/10 p-7 shadow-[var(--shadow-elevated)] sm:p-8">
          <div className="mb-6 hidden items-center justify-end lg:flex">
            <LanguageSwitcher className="flex items-center gap-1.5 rounded-lg border border-[#1F443C]/12 bg-[#E0EBE6]/60 px-3 py-2 text-sm font-medium text-ink-soft hover:border-[#D3A94C]/35" />
          </div>

          <h1 className="font-display text-2xl font-semibold text-ink">
            {t("welcomeBack")}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{t("signIn")}</p>

          {confirmEmail && (
            <p className="mt-4 rounded-lg border border-emerald-500/25 bg-emerald-50/90 px-3 py-2.5 text-sm text-emerald-900">
              {t("confirmEmailMessage")}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => signInWithOAuth("google", { next: nextSafe })}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#1F443C]/12 bg-white py-3 text-sm font-semibold text-ink shadow-sm transition-colors hover:border-[#D3A94C]/35 hover:bg-[#FAFCFB]"
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
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="divider-gold w-full" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="surface-panel px-3 text-ink-soft">{t("or")}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {t("password")}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("passwordPlaceholder")}
                className="input-premium"
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
              className="btn-primary-solid w-full py-3.5 disabled:opacity-50"
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

          <p className="mt-6 text-center text-sm text-ink-soft">
            {t("dontHaveAccount")}{" "}
            <Link
              href={signUpHref}
              className="font-semibold text-primary-dark hover:underline"
            >
              {t("signUp")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
