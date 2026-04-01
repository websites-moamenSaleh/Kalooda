"use client";

import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, totalPrice } = useCart();
  const { t, dir } = useLanguage();
  const { user } = useAuth();

  const checkoutHref = user
    ? "/checkout"
    : `/sign-in?next=${encodeURIComponent("/checkout")}`;

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 z-50 flex h-full w-full max-w-md flex-col bg-[#0A1A16] shadow-2xl shadow-black/60 transition-transform duration-300 ${
          dir === "rtl" ? "left-0" : "right-0"
        } ${
          open
            ? "translate-x-0"
            : dir === "rtl"
              ? "-translate-x-full"
              : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#D3A94C]/20 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#F5E6C8]">
            <ShoppingBag className="h-5 w-5 text-primary" />
            {t("yourCart")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#F5E6C8]/50 hover:bg-white/5 hover:text-[#F5E6C8] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#F5E6C8]/40">
              <ShoppingBag className="h-12 w-12 mb-3" />
              <p className="text-sm font-medium">{t("cartEmpty")}</p>
              <p className="text-xs mt-1">{t("cartEmptyHint")}</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.product.id}
                  className="flex items-center gap-4 rounded-xl border border-[#D3A94C]/15 bg-[#1F443C] p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#F5E6C8] truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-[#F5E6C8]/50">
                      ₪{item.product.price.toFixed(2)} {t("each")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateQuantity(item.product.id, item.quantity - 1)
                      }
                      className="rounded-md border border-[#D3A94C]/30 p-1 text-[#F5E6C8] hover:bg-[#D3A94C]/10 transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-[#F5E6C8]">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.product.id, item.quantity + 1)
                      }
                      className="rounded-md border border-[#D3A94C]/30 p-1 text-[#F5E6C8] hover:bg-[#D3A94C]/10 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="rounded-md p-1 text-[#F5E6C8]/40 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-[#D3A94C]/20 px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#F5E6C8]/70">
                {t("total")}
              </span>
              <span className="text-xl font-bold text-primary">
                ₪{totalPrice.toFixed(2)}
              </span>
            </div>
            <Link
              href={checkoutHref}
              onClick={onClose}
              className="block w-full rounded-xl bg-primary py-3 text-center text-sm font-bold text-[#0A2923] shadow-sm hover:bg-primary-dark transition-colors"
            >
              {user ? t("proceedToCheckout") : t("signInToCheckout")}
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
