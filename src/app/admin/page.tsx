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
import type { Order, Product, Driver } from "@/types/database";
import type { Profile } from "@/types/profile";
import {
  type OrderStatus,
  type FulfillmentType,
  adminSelectableStatuses,
  orderStatusTranslationKey,
} from "@/lib/order-status";

const PAGE_SIZE = 10;

type AdminTab = "orders" | "customers" | "products" | "drivers";

// Fixed pill definitions — always shown regardless of order counts
type PillKey =
  | "pending"
  | "preparing"
  | "out_for_delivery"
  | "ready_for_pickup"
  | "completed_delivery"
  | "completed_pickup";

const STATUS_PILLS = [
  { key: "pending" as PillKey, status: "pending" as OrderStatus, fulfillment: "delivery" as FulfillmentType },
  { key: "preparing" as PillKey, status: "preparing" as OrderStatus, fulfillment: "delivery" as FulfillmentType },
  { key: "out_for_delivery" as PillKey, status: "out_for_delivery" as OrderStatus, fulfillment: "delivery" as FulfillmentType },
  { key: "ready_for_pickup" as PillKey, status: "ready_for_pickup" as OrderStatus, fulfillment: "pickup" as FulfillmentType },
  { key: "completed_delivery" as PillKey, status: "completed" as OrderStatus, fulfillment: "delivery" as FulfillmentType },
  { key: "completed_pickup" as PillKey, status: "completed" as OrderStatus, fulfillment: "pickup" as FulfillmentType },
] as const;

const DEFAULT_ACTIVE_PILLS = new Set<PillKey>([
  "pending",
  "preparing",
  "out_for_delivery",
  "ready_for_pickup",
]);

const pillIcons: Record<PillKey, React.ElementType> = {
  pending: Clock,
  preparing: Package,
  out_for_delivery: Truck,
  ready_for_pickup: Store,
  completed_delivery: CheckCircle,
  completed_pickup: CheckCircle,
};

const pillColors: Record<PillKey, { color: string; bg: string }> = {
  pending: { color: "text-amber-700", bg: "bg-amber-100" },
  preparing: { color: "text-blue-700", bg: "bg-blue-100" },
  out_for_delivery: { color: "text-purple-700", bg: "bg-purple-100" },
  ready_for_pickup: { color: "text-teal-800", bg: "bg-teal-100" },
  completed_delivery: { color: "text-emerald-800", bg: "bg-emerald-100" },
  completed_pickup: { color: "text-emerald-800", bg: "bg-emerald-100" },
};

const rowStatusColors: Record<string, { color: string; bg: string }> = {
  pending: { color: "text-amber-700", bg: "bg-amber-100" },
  preparing: { color: "text-blue-700", bg: "bg-blue-100" },
  out_for_delivery: { color: "text-purple-700", bg: "bg-purple-100" },
  ready_for_pickup: { color: "text-teal-800", bg: "bg-teal-100" },
  completed: { color: "text-emerald-800", bg: "bg-emerald-100" },
};

const rowStatusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  preparing: Package,
  out_for_delivery: Truck,
  ready_for_pickup: Store,
  completed: CheckCircle,
};

export default function AdminDashboard() {
  const { t, locale } = useLanguage();

  const [activeTab, setActiveTab] = useState<AdminTab>("orders");

  // --- Orders ---
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersFetchFailed, setOrdersFetchFailed] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [activePills, setActivePills] = useState<Set<PillKey>>(
    new Set(DEFAULT_ACTIVE_PILLS)
  );
  const [ordersVisible, setOrdersVisible] = useState(PAGE_SIZE);

  // --- Customers ---
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersFetchFailed, setCustomersFetchFailed] = useState(false);
  const customersLoaded = useRef(false);
  const [customersVisible, setCustomersVisible] = useState(PAGE_SIZE);

  // --- Products (availability only) ---
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsFetchFailed, setProductsFetchFailed] = useState(false);
  const productsLoaded = useRef(false);
  const [availabilityErrors, setAvailabilityErrors] = useState<Record<string, string>>({});
  const [productsVisible, setProductsVisible] = useState(PAGE_SIZE);

  // --- Drivers (read-only) ---
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driversFetchFailed, setDriversFetchFailed] = useState(false);
  const driversLoaded = useRef(false);
  const [driversVisible, setDriversVisible] = useState(PAGE_SIZE);

  // ── Fetchers ──

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

  const loadProducts = useCallback(async () => {
    if (productsLoaded.current) return;
    setProductsLoading(true);
    setProductsFetchFailed(false);
    try {
      const res = await fetch("/api/products");
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data)) {
        setProductsFetchFailed(true);
        return;
      }
      setProducts(data);
      productsLoaded.current = true;
    } catch {
      setProductsFetchFailed(true);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const loadDrivers = useCallback(async () => {
    if (driversLoaded.current) return;
    setDriversLoading(true);
    setDriversFetchFailed(false);
    try {
      const res = await fetch("/api/drivers");
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data)) {
        setDriversFetchFailed(true);
        return;
      }
      setDrivers(data);
      driversLoaded.current = true;
    } catch {
      setDriversFetchFailed(true);
    } finally {
      setDriversLoading(false);
    }
  }, []);

  function handleTabChange(tab: AdminTab) {
    setActiveTab(tab);
    if (tab === "customers") void loadCustomers();
    if (tab === "products") void loadProducts();
    if (tab === "drivers") void loadDrivers();
  }

  // Mount: load orders + subscribe to realtime
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

  async function toggleAvailability(product: Product) {
    const next = !product.unavailable_today;
    const msg = t("availabilityUpdateFailed");

    setAvailabilityErrors((prev) => {
      const copy = { ...prev };
      delete copy[product.id];
      return copy;
    });
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, unavailable_today: next } : p))
    );

    try {
      const res = await fetch(`/api/products/${product.id}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unavailable_today: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, unavailable_today: !next } : p))
      );
      setAvailabilityErrors((prev) => ({ ...prev, [product.id]: msg }));
    }
  }

  function togglePill(key: PillKey) {
    setActivePills((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function pillCount(pill: (typeof STATUS_PILLS)[number]): number {
    return orders.filter((o) => {
      if (o.status !== pill.status) return false;
      if (pill.status === "completed") {
        const ft = (o.fulfillment_type ?? "delivery") === "pickup" ? "pickup" : "delivery";
        return ft === pill.fulfillment;
      }
      return true;
    }).length;
  }

  const filteredOrders = orders.filter((o) => {
    const ft: FulfillmentType =
      (o.fulfillment_type ?? "delivery") === "pickup" ? "pickup" : "delivery";
    if (o.status === "completed") {
      return activePills.has(
        ft === "delivery" ? "completed_delivery" : "completed_pickup"
      );
    }
    return activePills.has(o.status as PillKey);
  });

  const visibleOrders = filteredOrders.slice(0, ordersVisible);
  const visibleCustomers = customers.slice(0, customersVisible);
  const visibleProducts = products.slice(0, productsVisible);
  const visibleDrivers = drivers.slice(0, driversVisible);

  const tabs: { key: AdminTab; label: string }[] = [
    { key: "orders", label: t("orders") },
    { key: "customers", label: t("customers") },
    { key: "products", label: t("products") },
    { key: "drivers", label: t("drivers") },
  ];

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
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleTabChange(key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === key
                ? "bg-admin-ink text-white"
                : "text-admin-muted hover:bg-[rgba(31,68,60,0.05)] hover:text-admin-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Orders tab ── */}
      {activeTab === "orders" && (
        <div>
          {/* Fixed status filter pills — always rendered regardless of count */}
          <div className="mb-4 flex flex-wrap gap-2">
            {STATUS_PILLS.map((pill) => {
              const Icon = pillIcons[pill.key];
              const colors = pillColors[pill.key];
              const isActive = activePills.has(pill.key);
              const tKey = orderStatusTranslationKey({
                status: pill.status,
                fulfillment_type: pill.fulfillment,
              });
              const count = pillCount(pill);
              return (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => togglePill(pill.key)}
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
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">{t("order")}</th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">{t("customer")}</th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">{t("adminFulfillment")}</th>
                    <th className="max-w-[12rem] px-4 py-3 text-start font-semibold text-admin-muted">{t("adminDeliveryAddress")}</th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">{t("adminPaymentMethod")}</th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">{t("items")}</th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">{t("total")}</th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">{t("status")}</th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {visibleOrders.map((order) => {
                    const fulfillment: FulfillmentType =
                      (order.fulfillment_type ?? "delivery") === "pickup"
                        ? "pickup"
                        : "delivery";
                    const colors =
                      rowStatusColors[order.status] ?? rowStatusColors.pending;
                    const Icon =
                      rowStatusIcons[order.status] ?? Clock;
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
                        <td className="px-4 py-3 font-semibold text-admin-ink">{order.display_id}</td>
                        <td className="px-4 py-3 text-admin-ink">{order.customer_name}</td>
                        <td className="px-4 py-3 text-admin-muted">
                          {(order.fulfillment_type ?? "delivery") === "pickup"
                            ? t("fulfillmentPickup")
                            : t("fulfillmentDelivery")}
                        </td>
                        <td className="max-w-[12rem] whitespace-pre-wrap break-words px-4 py-3 text-admin-muted">
                          {(order.fulfillment_type ?? "delivery") === "delivery" &&
                          order.delivery_address
                            ? order.delivery_address
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-admin-muted">
                          {(order.payment_method ?? "cash_on_delivery") === "cash_on_delivery"
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
                      <td colSpan={9} className="px-4 py-12 text-center text-admin-muted">
                        <RefreshCw className="mx-auto h-5 w-5 animate-spin opacity-50" />
                      </td>
                    </tr>
                  )}
                  {!ordersLoading && orders.length === 0 && !ordersFetchFailed && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-admin-muted">
                        {t("noOrders")}
                      </td>
                    </tr>
                  )}
                  {!ordersLoading && orders.length > 0 && filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-admin-muted">
                        {t("adminNoActiveOrders")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

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
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">{t("name")}</th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">{t("phone")}</th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">{t("language")}</th>
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
                      <td colSpan={3} className="px-4 py-12 text-center text-admin-muted">
                        <RefreshCw className="mx-auto h-5 w-5 animate-spin opacity-50" />
                      </td>
                    </tr>
                  )}
                  {!customersLoading && customers.length === 0 && !customersFetchFailed && (
                    <tr>
                      <td colSpan={3} className="px-4 py-12 text-center text-admin-muted">
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

      {/* ── Products tab (availability toggle only) ── */}
      {activeTab === "products" && (
        <div>
          {productsFetchFailed && (
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium">{t("productsLoadFailed")}</p>
              <button
                type="button"
                onClick={() => {
                  productsLoaded.current = false;
                  void loadProducts();
                }}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-100"
              >
                {t("retryLoad")}
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProducts.map((product) => (
              <div
                key={product.id}
                className={`flex flex-col gap-2 rounded-xl border p-4 shadow-sm transition-colors ${
                  product.unavailable_today
                    ? "border-red-200 bg-red-50/80"
                    : "border-admin-border bg-admin-panel"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-admin-ink">
                      {locale === "ar" && product.name_ar
                        ? product.name_ar
                        : product.name}
                    </p>
                    <p className="text-xs text-admin-muted">
                      ₪{product.price.toFixed(2)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleAvailability(product)}
                    className={`ms-1 shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      product.unavailable_today
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    }`}
                  >
                    {product.unavailable_today
                      ? t("unavailableToday")
                      : t("available")}
                  </button>
                </div>
                {availabilityErrors[product.id] ? (
                  <p className="text-xs font-medium text-red-600">
                    {availabilityErrors[product.id]}
                  </p>
                ) : null}
              </div>
            ))}
            {productsLoading && (
              <div className="col-span-full py-12 text-center text-admin-muted">
                <RefreshCw className="mx-auto h-5 w-5 animate-spin opacity-50" />
              </div>
            )}
            {!productsLoading && products.length === 0 && !productsFetchFailed && (
              <p className="col-span-full py-8 text-center text-admin-muted">
                {t("noProductsYet")}
              </p>
            )}
          </div>
          {products.length > productsVisible && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setProductsVisible((v) => v + PAGE_SIZE)}
                className="rounded-lg border border-admin-border bg-admin-panel px-5 py-2 text-sm font-semibold text-admin-ink transition-colors hover:bg-[rgba(31,68,60,0.05)]"
              >
                {t("loadMore")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Drivers tab (read-only) ── */}
      {activeTab === "drivers" && (
        <div>
          {driversFetchFailed && (
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium">{t("driversLoadFailed")}</p>
              <button
                type="button"
                onClick={() => {
                  driversLoaded.current = false;
                  void loadDrivers();
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
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">{t("driverName")}</th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">{t("driverPhone")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {visibleDrivers.map((driver) => (
                    <tr key={driver.id}>
                      <td className="px-4 py-3 font-medium text-admin-ink">
                        {driver.name}
                      </td>
                      <td className="px-4 py-3 text-admin-muted">
                        {driver.phone ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-admin-muted/60" />
                            {driver.phone}
                          </span>
                        ) : (
                          <span className="text-admin-muted/50">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {driversLoading && (
                    <tr>
                      <td colSpan={2} className="px-4 py-12 text-center text-admin-muted">
                        <RefreshCw className="mx-auto h-5 w-5 animate-spin opacity-50" />
                      </td>
                    </tr>
                  )}
                  {!driversLoading && drivers.length === 0 && !driversFetchFailed && (
                    <tr>
                      <td colSpan={2} className="px-4 py-12 text-center text-admin-muted">
                        {t("noDrivers")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {drivers.length > driversVisible && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setDriversVisible((v) => v + PAGE_SIZE)}
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
