"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ShoppingCart,
  LayoutDashboard,
  LogOut,
  LogIn,
  User,
} from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import { useAdminAuth } from "@/contexts/admin-auth-context";
import { LanguageSwitcher } from "./language-switcher";

interface HeaderProps {
  onCartClick: () => void;
}

export function Header({ onCartClick }: HeaderProps) {
  const { totalItems } = useCart();
  const { t } = useLanguage();
  const { user, loading, signOut, profile } = useAuth();
  const { profile: adminProfile, loading: adminLoading } = useAdminAuth();

  const isAdminRole = (p: { role?: string } | null | undefined) =>
    p != null && (p.role === "admin" || p.role === "super_admin");

  // Prefer the storefront session: a stale sb-admin-auth cookie must not show Admin
  // while the user is signed in only as a customer (customer sign-out does not clear admin cookies).
  const showAdminLink =
    !loading &&
    (user
      ? isAdminRole(profile)
      : !adminLoading && isAdminRole(adminProfile));

  return (
    <header className="sticky top-0 z-40 border-b border-[#D3A94C]/20 bg-[#1A3B34]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 max-w-[55%] shrink items-center group sm:max-w-none"
        >
          <Image
            src="/brand/logo-transparent.png"
            alt="Kalooda"
            width={140}
            height={72}
            className="h-10 w-auto object-contain transition-opacity group-hover:opacity-80"
            priority
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none sm:gap-3">
          <LanguageSwitcher />

          {showAdminLink && (
            <Link
              href="/admin"
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-[#F5E6C8]/75 hover:text-[#D3A94C] hover:bg-white/5 transition-colors sm:px-3"
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              {t("admin")}
            </Link>
          )}

          {!loading && user ? (
            <>
              <Link
                href="/account"
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-[#F5E6C8]/75 hover:text-[#D3A94C] hover:bg-white/5 transition-colors sm:px-3"
              >
                <User className="h-4 w-4 shrink-0" />
                {t("account")}
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-[#F5E6C8]/75 hover:text-[#D3A94C] hover:bg-white/5 transition-colors sm:px-3"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {t("signOut")}
              </button>
            </>
          ) : !loading ? (
            <Link
              href="/sign-in"
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-[#F5E6C8]/75 hover:text-[#D3A94C] hover:bg-white/5 transition-colors sm:px-3"
            >
              <LogIn className="h-4 w-4 shrink-0" />
              {t("signIn")}
            </Link>
          ) : null}

          <button
            type="button"
            onClick={onCartClick}
            className="relative flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-[#0A2923] shadow-sm hover:bg-primary-dark transition-colors"
          >
            <ShoppingCart className="h-4 w-4" />
            {t("cart")}
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#F5E6C8] text-[11px] font-bold text-[#0A2923] ltr:-right-2 rtl:-left-2">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
