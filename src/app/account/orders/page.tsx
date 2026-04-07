"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import { Header } from "@/components/header";
import { CartDrawer } from "@/components/cart-drawer";
import { AccountSubnav } from "@/components/account-subnav";
import { OrderDetailModal } from "@/components/order-detail-modal";
import type { Order } from "@/types/database";
import { ArrowLeft, Loader2, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useCartDrawerEvent } from "@/hooks/use-cart-drawer-event";
import type { OrderStatus } from "@/lib/order-status";
import {
  orderStatusBadgeColors,
  orderStatusTranslationKey,
} from "@/lib/order-status";
import { getSupabaseCustomerBrowser } from "@/lib/supabase-client-customer";

export default function AccountOrdersPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useCartDrawerEvent(setCartOpen);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders/mine", { credentials: "same-origin" });
      if (res.ok) {
        const data = (await res.json()) as Order[];
        setOrders(Array.isArray(data) ? data : []);
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.id) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const supabase = getSupabaseCustomerBrowser();
    const channel = supabase
      .channel("customer-orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id?: string })?.id;
            if (!deletedId) return;
            setOrders((prev) => prev.filter((o) => o.id !== deletedId));
            setSelectedOrderId((prev) =>
              prev === deletedId ? null : prev
            );
            return;
          }

          const updated = payload.new as Order;
          if (!updated?.id) return;

          setOrders((prev) => {
            const exists = prev.find((o) => o.id === updated.id);
            if (exists) {
              return prev.map((o) =>
                o.id === updated.id ? { ...o, ...updated } : o
              );
            }
            return [updated, ...prev];
          });
        }
      )
      .subscribe();

    void fetchOrders();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authLoading, user?.id, fetchOrders]);

  const listOrderForModal =
    selectedOrderId != null
      ? (orders.find((o) => o.id === selectedOrderId) ?? null)
      : null;

  return (
    <>
      <Header onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <OrderDetailModal
        orderId={selectedOrderId}
        listOrder={listOrderForModal}
        onClose={() => setSelectedOrderId(null)}
      />

      <main className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition-colors hover:text-primary-dark"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t("backToShop")}
        </Link>

        <h1 className="font-display text-3xl font-semibold text-ink">
          {t("orderHistoryTitle")}
        </h1>

        <div className="mt-8">
          <AccountSubnav />
        </div>

        {authLoading || loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="surface-panel mt-8 rounded-xl border border-dashed border-[#1F443C]/15 p-12 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-[#D3A94C]/40" />
            <p className="mt-4 text-ink-soft">{t("orderHistoryEmpty")}</p>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {orders.map((o) => {
              const colors =
                orderStatusBadgeColors[o.status as OrderStatus] ??
                orderStatusBadgeColors.pending;
              return (
                <li
                  key={o.id}
                  onClick={() => setSelectedOrderId(o.id)}
                  className="surface-panel rounded-xl border border-[#1F443C]/10 p-5 transition-shadow hover:shadow-[var(--shadow-card)] cursor-pointer hover:border-[#1F443C]/25"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg font-semibold text-ink">
                        {o.display_id}
                      </p>
                      <p className="mt-1 text-xs text-ink-soft">
                        {new Date(o.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${colors.bg} ${colors.color}`}
                    >
                      {t(
                        orderStatusTranslationKey({
                          status: o.status as OrderStatus,
                          fulfillment_type: o.fulfillment_type,
                        })
                      )}
                    </span>
                  </div>
                  <p className="mt-4 font-display text-xl font-bold text-primary-dark">
                    ₪{Number(o.total_price).toFixed(2)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
