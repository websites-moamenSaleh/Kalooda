"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ShoppingBag, User } from "lucide-react";

export function SiteFooter() {
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <footer className="relative mt-20 border-t border-[#1F443C]/12 bg-gradient-to-b from-[#f5f0e6] to-[#ebe3d6]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D3A94C]/40 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <Image
                src="/brand/logo-transparent.png"
                alt="Kalooda"
                width={160}
                height={82}
                className="h-11 w-auto object-contain opacity-95 transition-opacity group-hover:opacity-100"
              />
            </Link>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-soft">
              {t("footerTagline")}
            </p>
            <div className="mt-6">
              <LanguageSwitcher className="inline-flex items-center gap-2 rounded-lg border border-[#1F443C]/15 bg-white/50 px-4 py-2.5 text-sm font-medium text-ink hover:border-[#D3A94C]/45 hover:bg-white transition-colors" />
            </div>
          </div>

          <div>
            <h3 className="font-display text-lg font-semibold tracking-wide text-ink">
              {t("footerExplore")}
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link
                  href="/#categories"
                  className="text-ink-soft hover:text-primary-dark transition-colors"
                >
                  {t("browseMenu")}
                </Link>
              </li>
              <li>
                <Link
                  href="/#categories"
                  className="text-ink-soft hover:text-primary-dark transition-colors"
                >
                  {t("viewCategories")}
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  className="text-start text-ink-soft hover:text-primary-dark transition-colors"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("kalooda:open-cart"));
                  }}
                >
                  {t("cart")}
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-lg font-semibold tracking-wide text-ink">
              {t("account")}
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              {user ? (
                <>
                  <li>
                    <Link
                      href="/account"
                      className="inline-flex items-center gap-2 text-ink-soft hover:text-primary-dark transition-colors"
                    >
                      <User className="h-4 w-4 opacity-70" />
                      {t("myProfile")}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/account/orders"
                      className="inline-flex items-center gap-2 text-ink-soft hover:text-primary-dark transition-colors"
                    >
                      <ShoppingBag className="h-4 w-4 opacity-70" />
                      {t("myOrders")}
                    </Link>
                  </li>
                </>
              ) : (
                <li>
                  <Link
                    href="/sign-in"
                    className="text-ink-soft hover:text-primary-dark transition-colors"
                  >
                    {t("signIn")}
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="divider-gold mt-12" />
        <p className="mt-8 text-center text-xs text-ink-soft/80">
          {t("footerFinePrint")}
        </p>
      </div>
    </footer>
  );
}
