"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

function subscribeNoop() {
  return () => {};
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const hydrated = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const { items, removeItem, updateQuantity, totalPrice, cartReady } = useCart();
  const { t, dir, locale } = useLanguage();
  const { user } = useAuth();

  if (!hydrated) return null;

  const checkoutHref = user
    ? "/checkout"
    : `/sign-in?next=${encodeURIComponent("/checkout")}`;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-[#1f443c]/35 backdrop-blur-md transition-opacity animate-fade-in"
          onClick={onClose}
          aria-hidden
        />
      )}

      <div
        className={`fixed top-0 z-[55] flex h-full w-full max-w-lg flex-col border-[#D3A94C]/30 bg-gradient-to-b from-[#fffcf8] via-[#faf6ef] to-[#f5f0e6] shadow-[0_0_48px_rgba(10,41,35,0.12)] transition-transform duration-300 ease-out ${
          dir === "rtl" ? "left-0 border-e" : "right-0 border-s"
        } ${
          open
            ? "translate-x-0"
            : dir === "rtl"
              ? "-translate-x-full"
              : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#1f443c]/10 bg-[#fffcf8]/90 px-6 py-5">
          <h2 className="font-display flex items-center gap-3 text-xl font-semibold text-ink">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D3A94C]/18 text-[#946e2a]">
              <ShoppingBag className="h-5 w-5" />
            </span>
            {t("yourCart")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ink-soft/50 transition-colors hover:bg-[#1f443c]/[0.06] hover:text-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!open ? null : !cartReady ? (
            <ul className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <li
                  key={`cart-drawer-skeleton-${index}`}
                  className="flex flex-col gap-4 rounded-xl border border-[#1f443c]/10 bg-white/85 p-4 shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-[#1f443c]/10" />
                    <div className="w-full max-w-[10rem] animate-pulse">
                      <div className="h-4 w-3/4 rounded bg-[#1f443c]/10" />
                      <div className="mt-2 h-3 w-1/2 rounded bg-[#1f443c]/10" />
                    </div>
                  </div>
                  <div className="h-8 w-24 animate-pulse rounded-lg bg-[#1f443c]/10" />
                </li>
              ))}
            </ul>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D3A94C]/30 bg-white/60 px-6 py-20 text-center">
              <ShoppingBag className="h-14 w-14 text-[#D3A94C]/45" />
              <p className="mt-4 font-medium text-ink">
                {t("cartEmpty")}
              </p>
              <p className="mt-2 text-sm text-ink-soft/80">{t("cartEmptyHint")}</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.product.id}
                  className="flex flex-col gap-4 rounded-xl border border-[#1f443c]/10 bg-white/85 p-4 shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {item.product.image_url ? (
                      <Image
                        src={item.product.image_url}
                        alt={item.product.name}
                        width={48}
                        height={48}
                        sizes="48px"
                        className="rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-[#1f443c]/8 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">
                        {locale === "ar" && item.product.name_ar ? item.product.name_ar : item.product.name}
                      </p>
                      <p className="mt-1 text-xs text-ink-soft/75">
                        ₪{item.product.price.toFixed(2)} {t("each")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="flex items-center gap-1 rounded-lg border border-[#1f443c]/12 bg-[#faf6ef] p-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1)
                        }
                        className="rounded-md p-2 text-ink transition-colors hover:bg-[#D3A94C]/15"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-8 text-center text-sm font-bold text-ink">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1)
                        }
                        className="rounded-md p-2 text-ink transition-colors hover:bg-[#D3A94C]/15"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.product.id)}
                      className="rounded-lg p-2 text-ink-soft/40 transition-colors hover:bg-red-500/[0.08] hover:text-red-600"
                      aria-label="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {open && cartReady && items.length > 0 && (
          <div className="border-t border-[#1f443c]/10 bg-[#fffcf8] px-6 py-5 shadow-[0_-8px_24px_rgba(10,41,35,0.04)]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium uppercase tracking-wide text-ink-soft">
                {t("total")}
              </span>
              <span className="font-display text-2xl font-bold text-primary-dark">
                ₪{totalPrice.toFixed(2)}
              </span>
            </div>
            <Link
              href={checkoutHref}
              onClick={onClose}
              className="btn-primary-solid mt-4 block w-full py-3.5 text-center"
            >
              {user ? t("proceedToCheckout") : t("signInToCheckout")}
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
