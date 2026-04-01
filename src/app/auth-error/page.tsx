"use client";

import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function AuthErrorPage() {
  const { signOut } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-10 flex items-center gap-4">
        <Link href="/">
          <Image
            src="/brand/logo-transparent.png"
            alt="Kalooda"
            width={160}
            height={82}
            className="h-11 w-auto object-contain"
          />
        </Link>
        <LanguageSwitcher className="flex items-center gap-1.5 rounded-lg border border-[#1F443C]/12 bg-white/80 px-3 py-2 text-sm font-medium text-ink-soft hover:border-[#D3A94C]/35" />
      </div>

      <div className="surface-dark w-full max-w-md rounded-2xl border border-[#D3A94C]/20 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>

        <h1 className="font-display text-xl font-semibold text-[#F0F5F3] sm:text-2xl">
          {t("authErrorTitle")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#A8B5AD]/85">
          {t("authErrorMessage")}
        </p>

        <button
          type="button"
          onClick={signOut}
          className="btn-outline-light mt-8 w-full justify-center border-[#D3A94C]/25 py-3.5"
        >
          <LogOut className="h-4 w-4" />
          {t("signOut")}
        </button>
      </div>
    </div>
  );
}
