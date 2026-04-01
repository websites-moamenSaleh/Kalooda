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
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/">
          <Image
            src="/brand/logo-transparent.png"
            alt="Kalooda"
            width={140}
            height={72}
            className="h-10 w-auto object-contain"
          />
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-[#D3A94C]/20 bg-[#1F443C] p-6 shadow-2xl shadow-black/40 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
          <AlertTriangle className="h-7 w-7 text-amber-400" />
        </div>

        <h1 className="mb-2 text-lg font-bold text-[#F5E6C8]">
          {t("authErrorTitle")}
        </h1>
        <p className="mb-6 text-sm text-[#F5E6C8]/60">
          {t("authErrorMessage")}
        </p>

        <button
          onClick={signOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#163530] border border-[#D3A94C]/20 py-3 text-sm font-bold text-[#F5E6C8] shadow-sm hover:bg-[#D3A94C]/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {t("signOut")}
        </button>
      </div>
    </div>
  );
}
