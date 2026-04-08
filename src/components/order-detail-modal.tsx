"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/language-context";
import { useCart } from "@/contexts/cart-context";
import { useFlyToCart } from "@/contexts/fly-to-cart-context";
import type { Order, OrderItem } from "@/types/database";
import Image from "next/image";
import { X, Loader2, ShoppingBag } from "lucide-react";
import type { OrderStatus } from "@/lib/order-status";
import {
  orderStatusBadgeColors,
  orderStatusTranslationKey,
} from "@/lib/order-status";

interface Props {
  orderId: string | null;
  /** Live row from My Orders when open; keeps status in sync with Realtime. */
  listOrder?: Order | null;
  onClose: () => void;
}

export function OrderDetailModal({
  orderId,
  listOrder = null,
  onClose,
}: Props) {
  const { t, locale } = useLanguage();
  const { addItem } = useCart();
  const { flyToCart } = useFlyToCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [reordered, setReordered] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

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

  const displayOrder =
    order && listOrder && listOrder.id === order.id
      ? {
          ...order,
          status: listOrder.status,
          fulfillment_type: listOrder.fulfillment_type,
        }
      : order;

  const statusPill =
    displayOrder != null
      ? (orderStatusBadgeColors[displayOrder.status as OrderStatus] ??
        orderStatusBadgeColors.pending)
      : orderStatusBadgeColors.pending;

  function handleReorder() {
    if (!displayOrder?.items) return;
    displayOrder.items.forEach((item: OrderItem) => {
      const product = {
        id: item.product_id,
        name: item.product_name,
        price: item.unit_price,
        category_id: "",
        description: "",
        stock_quantity: 99,
        ingredients: "",
        allergens: [],
        allergens_ar: null,
        image_url: item.image_url ?? "",
        name_ar: item.product_name_ar ?? null,
        description_ar: null,
        ingredients_ar: null,
        unavailable_today: false,
      };
      // addItem increments by 1 each call — call it quantity times
      for (let i = 0; i < item.quantity; i++) {
        addItem(product);
      }
    });
    flyToCart({ sourceEl: panelRef.current });
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
      <div
        ref={panelRef}
        className="relative w-full max-w-md rounded-2xl surface-panel border border-[#1F443C]/10 shadow-[var(--shadow-elevated)] flex flex-col max-h-[85vh]"
      >
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
          ) : !displayOrder ? (
            <p className="py-12 text-center text-ink-soft">
              {t("loadingOrder")}
            </p>
          ) : (
            <>
              {/* Order meta */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <p className="font-display text-xl font-semibold text-ink">
                    {displayOrder.display_id}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {new Date(displayOrder.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusPill.bg} ${statusPill.color}`}
                >
                  {t(
                    orderStatusTranslationKey({
                      status: displayOrder.status as OrderStatus,
                      fulfillment_type: displayOrder.fulfillment_type,
                    })
                  )}
                </span>
              </div>

              <div className="mb-5 space-y-2 rounded-xl border border-[#1F443C]/10 bg-[#1F443C]/[0.03] px-4 py-3 text-sm">
                <p className="text-ink-soft">
                  <span className="font-semibold text-ink">{t("adminFulfillment")}:</span>{" "}
                  {(displayOrder.fulfillment_type ?? "delivery") === "pickup"
                    ? t("fulfillmentPickup")
                    : t("fulfillmentDelivery")}
                </p>
                {(displayOrder.fulfillment_type ?? "delivery") === "delivery" &&
                displayOrder.delivery_address ? (
                  <p className="text-ink-soft">
                    <span className="font-semibold text-ink">{t("adminDeliveryAddress")}:</span>{" "}
                    {displayOrder.delivery_address}
                  </p>
                ) : null}
                <p className="text-ink-soft">
                  <span className="font-semibold text-ink">{t("adminPaymentMethod")}:</span>{" "}
                  {(displayOrder.payment_method ?? "cash_on_delivery") ===
                  "cash_on_delivery"
                    ? t("cashOnDelivery")
                    : displayOrder.payment_method}
                </p>
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
                    {displayOrder.items.map((item: OrderItem, i: number) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-ink">
                          <div className="flex items-center gap-3">
                            {item.image_url ? (
                              <Image
                                src={item.image_url}
                                alt={item.product_name}
                                width={40}
                                height={40}
                                sizes="40px"
                                className="rounded-lg object-cover shrink-0"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-[#1F443C]/8 shrink-0" />
                            )}
                            <div>
                              <p>{locale === "ar" && item.product_name_ar ? item.product_name_ar : item.product_name}</p>
                              <p className="text-xs text-ink-soft">
                                ₪{item.unit_price.toFixed(2)} / {t("unitPrice").toLowerCase()}
                              </p>
                            </div>
                          </div>
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
                  ₪{Number(displayOrder.total_price).toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {displayOrder && !loading && (
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
