"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingCart,
  LogOut,
  LogIn,
  User,
  Menu,
  X,
} from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import { LanguageSwitcher } from "./language-switcher";

interface HeaderProps {
  onCartClick: () => void;
}

export function Header({ onCartClick }: HeaderProps) {
  const { totalItems } = useCart();
  const { t, dir } = useLanguage();
  const { user, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  const navLinkClass =
    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-[#E5EDE8]/85 transition-colors hover:bg-white/[0.06] hover:text-[#FFEC94]";

  return (
    <header className="sticky top-0 z-40 border-b border-[#D3A94C]/25 bg-gradient-to-b from-[#0A2923] via-[#123A33] to-[#082018] shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href="/"
          onClick={closeMobile}
          className="flex min-w-0 shrink-0 items-center group"
        >
          <Image
            src="/brand/logo-transparent.png"
            alt="Kalooda"
            width={160}
            height={82}
            className="h-9 w-auto object-contain transition-opacity group-hover:opacity-90 sm:h-11"
            priority
          />
        </Link>

        <div className="hidden lg:flex flex-1 items-center justify-end gap-1 xl:gap-2">
          <LanguageSwitcher />
          {!loading && user ? (
            <>
              <Link href="/account" className={navLinkClass}>
                <User className="h-4 w-4 shrink-0 opacity-80" />
                {t("account")}
              </Link>
              <button type="button" onClick={signOut} className={navLinkClass}>
                <LogOut className="h-4 w-4 shrink-0 opacity-80" />
                {t("signOut")}
              </button>
            </>
          ) : !loading ? (
            <Link href="/sign-in" className={navLinkClass}>
              <LogIn className="h-4 w-4 shrink-0 opacity-80" />
              {t("signIn")}
            </Link>
          ) : null}

          <button
            type="button"
            onClick={onCartClick}
            className="relative ms-2 inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-[#E6BE68] to-[#D3A94C] px-5 py-2.5 text-sm font-bold text-[#082018] shadow-[0_2px_12px_rgba(211, 169, 76,0.35)] transition-all hover:brightness-105 hover:shadow-[0_4px_20px_rgba(211, 169, 76,0.45)] active:scale-[0.98]"
          >
            <ShoppingCart className="h-4 w-4" />
            {t("cart")}
            {totalItems > 0 && (
              <span className="absolute -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F0F5F3] px-1 text-[11px] font-bold text-[#082018] shadow-sm ltr:-right-1 rtl:-left-1">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={onCartClick}
            className="relative flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-b from-[#E6BE68] to-[#D3A94C] text-[#082018] shadow-md transition-transform active:scale-95"
            aria-label={t("cart")}
          >
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F0F5F3] px-0.5 text-[10px] font-bold text-[#082018]">
                {totalItems}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#D3A94C]/25 bg-white/[0.04] text-[#E5EDE8] transition-colors hover:bg-white/[0.08]"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md lg:hidden animate-fade-in"
            onClick={closeMobile}
            aria-hidden
          />
          <div
            className={`fixed inset-y-0 z-[60] flex w-[min(100%,20rem)] flex-col bg-gradient-to-b from-[#0A2923] to-[#082018] shadow-2xl shadow-black/50 lg:hidden animate-slide-up ${
              dir === "rtl"
                ? "left-0 border-r border-[#D3A94C]/20"
                : "right-0 border-l border-[#D3A94C]/20"
            }`}
          >
            <div className="flex items-center justify-between border-b border-[#D3A94C]/15 px-4 py-4">
              <span className="font-display text-lg font-semibold text-[#E5EDE8]">
                {t("navMenu")}
              </span>
              <button
                type="button"
                onClick={closeMobile}
                className="rounded-lg p-2 text-[#E5EDE8]/60 hover:bg-white/[0.06] hover:text-[#E5EDE8]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-1 p-4">
              <div className="pb-2">
                <LanguageSwitcher className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#D3A94C]/20 bg-white/[0.04] px-4 py-3 text-sm font-medium text-[#E5EDE8]" />
              </div>
              {!loading && user ? (
                <>
                  <Link
                    href="/account"
                    onClick={closeMobile}
                    className={navLinkClass + " border border-transparent hover:border-[#D3A94C]/15"}
                  >
                    <User className="h-4 w-4" />
                    {t("account")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      closeMobile();
                      void signOut();
                    }}
                    className={
                      navLinkClass +
                      " w-full border border-transparent hover:border-[#D3A94C]/15"
                    }
                  >
                    <LogOut className="h-4 w-4" />
                    {t("signOut")}
                  </button>
                </>
              ) : !loading ? (
                <Link
                  href="/sign-in"
                  onClick={closeMobile}
                  className={navLinkClass + " border border-transparent hover:border-[#D3A94C]/15"}
                >
                  <LogIn className="h-4 w-4" />
                  {t("signIn")}
                </Link>
              ) : null}
              <Link
                href="/#categories"
                onClick={closeMobile}
                className={
                  navLinkClass +
                  " mt-2 border border-[#D3A94C]/25 bg-[#D3A94C]/10 text-[#FFEC94]"
                }
              >
                {t("browseMenu")}
              </Link>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
