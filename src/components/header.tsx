"use client";

import Link from "next/link";
import { ShoppingCart, Candy, LayoutDashboard, LogOut, LogIn } from "lucide-react";
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
  const { user, loading, signOut } = useAuth();
  const { profile: adminProfile, loading: adminLoading } = useAdminAuth();

  const hasAdminSession =
    !adminLoading &&
    adminProfile &&
    (adminProfile.role === "admin" || adminProfile.role === "super_admin");

  return (
    <header className="sticky top-0 z-40 border-b border-rose-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 max-w-[55%] shrink items-center gap-2 group sm:max-w-none"
        >
          <Candy className="h-7 w-7 shrink-0 text-primary group-hover:rotate-12 transition-transform" />
          <span className="truncate text-xl font-bold tracking-tight text-stone-900">
            SweetDrop
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none sm:gap-3">
          <LanguageSwitcher />

          {!adminLoading && hasAdminSession && (
            <Link
              href="/admin"
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors sm:px-3"
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              {t("admin")}
            </Link>
          )}

          {!loading && user ? (
            <button
              type="button"
              onClick={signOut}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors sm:px-3"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {t("signOut")}
            </button>
          ) : !loading ? (
            <Link
              href="/sign-in"
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors sm:px-3"
            >
              <LogIn className="h-4 w-4 shrink-0" />
              {t("signIn")}
            </Link>
          ) : null}

          <button
            type="button"
            onClick={onCartClick}
            className="relative flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition-colors"
          >
            <ShoppingCart className="h-4 w-4" />
            {t("cart")}
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-stone-900 ltr:-right-2 rtl:-left-2">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
