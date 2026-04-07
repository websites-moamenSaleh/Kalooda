"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  RefreshCw,
  Clock,
  Truck,
  Package,
  CheckCircle,
  Store,
  Phone,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { getSupabaseAdminBrowser } from "@/lib/supabase-client-admin";
import type { Order } from "@/types/database";
import type { Profile } from "@/types/profile";
import {
  ORDER_STATUSES,
  type OrderStatus,
  type FulfillmentType,
  adminSelectableStatuses,
  orderStatusTranslationKey,
} from "@/lib/order-status";

const PAGE_SIZE = 10;

type AdminTab = "orders" | "customers";

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  preparing: Package,
  out_for_delivery: Truck,
  ready_for_pickup: Store,
  completed: CheckCircle,
};

const statusColors: Record<string, { color: string; bg: string }> = {
  pending: { color: "text-amber-700", bg: "bg-amber-100" },
  preparing: { color: "text-blue-700", bg: "bg-blue-100" },
  out_for_delivery: { color: "text-purple-700", bg: "bg-purple-100" },
  ready_for_pickup: { color: "text-teal-800", bg: "bg-teal-100" },
  completed: { color: "text-emerald-800", bg: "bg-emerald-100" },
};

const DEFAULT_ACTIVE_STATUSES = new Set<OrderStatus>(
  ORDER_STATUSES.filter((s) => s !== "completed")
);

export default function AdminDashboard() {
  const { t, locale } = useLanguage();

  const [activeTab, setActiveTab] = useState<AdminTab>("orders");

  // --- Orders ---
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersFetchFailed, setOrdersFetchFailed] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [activeStatuses, setActiveStatuses] = useState<Set<OrderStatus>>(
    new Set(DEFAULT_ACTIVE_STATUSES)
  );
  const [ordersVisible, setOrdersVisible] = useState(PAGE_SIZE);

  // --- Customers ---
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersFetchFailed, setCustomersFetchFailed] = useState(false);
  const customersLoaded = useRef(false);
  const [customersVisible, setCustomersVisible] = useState(PAGE_SIZE);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data)) {
        setOrdersFetchFailed(true);
        return;
      }
      setOrders(data);
      setOrdersFetchFailed(false);
    } catch {
      setOrdersFetchFailed(true);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    if (customersLoaded.current) return;
    setCustomersLoading(true);
    setCustomersFetchFailed(false);
    try {
      const res = await fetch("/api/admin/customers");
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data)) {
        setCustomersFetchFailed(true);
        return;
      }
      setCustomers(data);
      customersLoaded.current = true;
    } catch {
      setCustomersFetchFailed(true);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  function handleTabChange(tab: AdminTab) {
    setActiveTab(tab);
    if (tab === "customers") void loadCustomers();
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setOrdersLoading(true);
      await loadOrders();
      if (!cancelled) setOrdersLoading(false);
    })();

    const supabase = getSupabaseAdminBrowser();
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const updated = payload.new as Order;
          setOrders((prev) => {
            const exists = prev.find((o) => o.id === updated.id);
            if (exists) {
              return prev.map((o) =>
                o.id === updated.id ? { ...o, ...updated } : o
              );
            }
            return [updated, ...prev];
          });
          setFlashId(updated.id);
          setTimeout(() => setFlashId(null), 3000);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  async function updateStatus(orderId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        await loadOrders();
        return;
      }
      const data = (await res.json()) as Order;
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...data } : o))
      );
      setFlashId(orderId);
      setTimeout(() => setFlashId(null), 3000);
    } catch {
      await loadOrders();
    }
  }

  function toggleStatus(status: OrderStatus) {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }

  const filteredOrders = orders.filter((o) =>
    activeStatuses.has(o.status as OrderStatus)
  );
  const visibleOrders = filteredOrders.slice(0, ordersVisible);
  const visibleCustomers = customers.slice(0, customersVisible);

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-admin-ink">
          {t("adminDashboard")}
        </h1>
        {activeTab === "orders" && (
          <button
            type="button"
            onClick={() => void loadOrders()}
            disabled={ordersLoading}
            className="rounded-lg border border-admin-border bg-admin-panel p-2 text-admin-muted transition-colors hover:bg-[rgba(31,68,60,0.05)] disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${ordersLoading ? "animate-spin" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Tab nav */}
      <div className="mb-6 flex w-fit gap-1 rounded-xl border border-admin-border bg-admin-panel p-1">
        {(["orders", "customers"] as AdminTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabChange(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab
                ? "bg-admin-ink text-white"
                : "text-admin-muted hover:bg-[rgba(31,68,60,0.05)] hover:text-admin-ink"
            }`}
          >
            {tab === "orders" ? t("orders") : t("customers")}
          </button>
        ))}
      </div>

      {/* ── Orders tab ── */}
      {activeTab === "orders" && (
        <div>
          {/* Per-status filter pills */}
          <div className="mb-4 flex flex-wrap gap-2">
            {ORDER_STATUSES.map((status) => {
              const Icon = statusIcons[status];
              const colors = statusColors[status];
              const isActive = activeStatuses.has(status);
              const tKey = orderStatusTranslationKey({
                status,
                fulfillment_type: "delivery",
              });
              const count = orders.filter((o) => o.status === status).length;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleStatus(status)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? `${colors.bg} ${colors.color} border-transparent`
                      : "border-admin-border bg-admin-panel text-admin-muted hover:bg-[rgba(31,68,60,0.05)]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(tKey)}
                  <span
                    className={`ms-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      isActive ? "bg-white/40" : "bg-[rgba(31,68,60,0.06)]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Error banner */}
          {ordersFetchFailed && (
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium">{t("ordersLoadFailed")}</p>
              <button
                type="button"
                onClick={() => void loadOrders()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-100"
              >
                {t("retryLoad")}
              </button>
            </div>
          )}

          {/* Orders table */}
          <div className="overflow-hidden rounded-xl border border-admin-border bg-admin-panel shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="admin-table-head text-start">
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">
                      {t("order")}
                    </th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">
                      {t("customer")}
                    </th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">
                      {t("adminFulfillment")}
                    </th>
                    <th className="max-w-[12rem] px-4 py-3 text-start font-semibold text-admin-muted">
                      {t("adminDeliveryAddress")}
                    </th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">
                      {t("adminPaymentMethod")}
                    </th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">
                      {t("items")}
                    </th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">
                      {t("total")}
                    </th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">
                      {t("status")}
                    </th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">
                      {t("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {visibleOrders.map((order) => {
                    const fulfillment: FulfillmentType =
                      (order.fulfillment_type ?? "delivery") === "pickup"
                        ? "pickup"
                        : "delivery";
                    const colors =
                      statusColors[order.status] ?? statusColors.pending;
                    const Icon = statusIcons[order.status] ?? Clock;
                    const tKey = orderStatusTranslationKey({
                      status: order.status as OrderStatus,
                      fulfillment_type: order.fulfillment_type,
                    });
                    const selectable = adminSelectableStatuses({
                      current: order.status as OrderStatus,
                      fulfillment,
                    });
                    return (
                      <tr
                        key={order.id}
                        className={`transition-colors ${
                          flashId === order.id ? "pulse-green bg-emerald-50" : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold text-admin-ink">
                          {order.display_id}
                        </td>
                        <td className="px-4 py-3 text-admin-ink">
                          {order.customer_name}
                        </td>
                        <td className="px-4 py-3 text-admin-muted">
                          {(order.fulfillment_type ?? "delivery") === "pickup"
                            ? t("fulfillmentPickup")
                            : t("fulfillmentDelivery")}
                        </td>
                        <td className="max-w-[12rem] whitespace-pre-wrap break-words px-4 py-3 text-admin-muted">
                          {(order.fulfillment_type ?? "delivery") ===
                            "delivery" && order.delivery_address
                            ? order.delivery_address
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-admin-muted">
                          {(order.payment_method ?? "cash_on_delivery") ===
                          "cash_on_delivery"
                            ? t("cashOnDelivery")
                            : order.payment_method}
                        </td>
                        <td className="px-4 py-3 text-admin-muted">
                          {order.items
                            .map(
                              (i) =>
                                `${locale === "ar" && i.product_name_ar ? i.product_name_ar : i.product_name} (x${i.quantity})`
                            )
                            .join(", ")}
                        </td>
                        <td className="px-4 py-3 font-semibold text-admin-ink">
                          ₪{order.total_price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${colors.bg} ${colors.color}`}
                          >
                            <Icon className="h-3 w-3" />
                            {t(tKey)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={order.status}
                            disabled={order.status === "completed"}
                            onChange={(e) =>
                              void updateStatus(order.id, e.target.value)
                            }
                            className="admin-input max-w-[13rem] px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {selectable.map((opt) => (
                              <option key={opt} value={opt}>
                                {t(
                                  orderStatusTranslationKey({
                                    status: opt,
                                    fulfillment_type: order.fulfillment_type,
                                  })
                                )}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                  {ordersLoading && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-12 text-center text-admin-muted"
                      >
                        <RefreshCw className="mx-auto h-5 w-5 animate-spin opacity-50" />
                      </td>
                    </tr>
                  )}
                  {!ordersLoading &&
                    orders.length === 0 &&
                    !ordersFetchFailed && (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-12 text-center text-admin-muted"
                        >
                          {t("noOrders")}
                        </td>
                      </tr>
                    )}
                  {!ordersLoading &&
                    orders.length > 0 &&
                    filteredOrders.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-12 text-center text-admin-muted"
                        >
                          {t("adminNoActiveOrders")}
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Load More */}
          {filteredOrders.length > ordersVisible && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setOrdersVisible((v) => v + PAGE_SIZE)}
                className="rounded-lg border border-admin-border bg-admin-panel px-5 py-2 text-sm font-semibold text-admin-ink transition-colors hover:bg-[rgba(31,68,60,0.05)]"
              >
                {t("loadMore")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Customers tab ── */}
      {activeTab === "customers" && (
        <div>
          {customersFetchFailed && (
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium">{t("customersLoadFailed")}</p>
              <button
                type="button"
                onClick={() => {
                  customersLoaded.current = false;
                  void loadCustomers();
                }}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-100"
              >
                {t("retryLoad")}
              </button>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-admin-border bg-admin-panel shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="admin-table-head text-start">
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">
                      {t("name")}
                    </th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">
                      {t("phone")}
                    </th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">
                      {t("language")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {visibleCustomers.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 font-medium text-admin-ink">
                        {c.full_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-admin-muted">
                        {c.phone ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-admin-muted/60" />
                            {c.phone}
                          </span>
                        ) : (
                          <span className="text-admin-muted/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-admin-muted">
                        {c.preferred_language ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {customersLoading && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-12 text-center text-admin-muted"
                      >
                        <RefreshCw className="mx-auto h-5 w-5 animate-spin opacity-50" />
                      </td>
                    </tr>
                  )}
                  {!customersLoading &&
                    customers.length === 0 &&
                    !customersFetchFailed && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-12 text-center text-admin-muted"
                        >
                          {t("noCustomers")}
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>

          {customers.length > customersVisible && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setCustomersVisible((v) => v + PAGE_SIZE)}
                className="rounded-lg border border-admin-border bg-admin-panel px-5 py-2 text-sm font-semibold text-admin-ink transition-colors hover:bg-[rgba(31,68,60,0.05)]"
              >
                {t("loadMore")}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
