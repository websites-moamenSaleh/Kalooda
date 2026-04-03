"use client";

import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/contexts/language-context";
import { useCart } from "@/contexts/cart-context";
import type { Order, OrderItem } from "@/types/database";
import type { TranslationKey } from "@/lib/translations";
import { X, Loader2, ShoppingBag } from "lucide-react";

const STATUS_KEY: Record<Order["status"], TranslationKey> = {
  pending: "pending",
  preparing: "preparing",
  out_for_delivery: "outForDelivery",
};

interface Props {
  orderId: string | null;
  onClose: () => void;
}

export function OrderDetailModal({ orderId, onClose }: Props) {
  const { t } = useLanguage();
  const { addItem } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [reordered, setReordered] = useState(false);

  const fetchOrder = useCallback(async (id: string) => {
    setLoading(true);
    setOrder(null);
    setReordered(false);
    try {
      const res = await fetch(`/api/orders/${id}`, { credentials: "same-origin" });
      if (res.ok) {
        const data = (await res.json()) as Order;
        setOrder(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (orderId) void fetchOrder(orderId);
  }, [orderId, fetchOrder]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    if (orderId) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [orderId]);

  if (!orderId) return null;

  function handleReorder() {
    if (!order?.items) return;
    order.items.forEach((item: OrderItem) => {
      // Build a minimal product shape from order item data
      addItem({
        id: item.product_id,
        name: item.product_name,
        price: item.unit_price,
        // Required Product fields — use safe defaults for reorder
        category_id: "",
        description: "",
        stock_quantity: 99,
        ingredients: "",
        allergens: [],
        image_url: "",
        name_ar: null,
        description_ar: null,
        ingredients_ar: null,
        unavailable_today: false,
      });
    });
    setReordered(true);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl surface-panel border border-[#1F443C]/10 shadow-[var(--shadow-elevated)] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F443C]/10 shrink-0">
          <h2 className="font-display text-lg font-semibold text-ink">
            {t("orderDetails")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-soft hover:bg-[#1F443C]/8 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 flex-1">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !order ? (
            <p className="py-12 text-center text-ink-soft">
              {t("loadingOrder")}
            </p>
          ) : (
            <>
              {/* Order meta */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <p className="font-display text-xl font-semibold text-ink">
                    {order.display_id}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-[#D3A94C]/30 bg-[#FFF8E6] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#946E2A]">
                  {t(STATUS_KEY[order.status])}
                </span>
              </div>

              {/* Items table */}
              <div className="rounded-xl border border-[#1F443C]/10 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#1F443C]/5 text-left">
                      <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ink-soft">
                        {t("items")}
                      </th>
                      <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-ink-soft text-center">
                        {t("qty")}
                      </th>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ink-soft text-right">
                        {t("subtotal")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F443C]/8">
                    {order.items.map((item: OrderItem, i: number) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-ink">
                          <p>{item.product_name}</p>
                          <p className="text-xs text-ink-soft">
                            ₪{item.unit_price.toFixed(2)} / {t("unitPrice").toLowerCase()}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-center text-ink-soft">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-ink">
                          ₪{(item.unit_price * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total */}
              <div className="mt-4 flex items-center justify-between border-t border-[#1F443C]/12 pt-4">
                <span className="font-semibold text-ink">{t("total")}</span>
                <span className="font-display text-2xl font-bold text-primary-dark">
                  ₪{Number(order.total_price).toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {order && !loading && (
          <div className="shrink-0 px-6 py-4 border-t border-[#1F443C]/10">
            <button
              onClick={handleReorder}
              disabled={reordered}
              className="btn-primary-solid w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShoppingBag className="h-4 w-4" />
              {t("reorder")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
