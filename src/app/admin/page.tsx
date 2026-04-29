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
  XCircle,
  X,
  Search,
  Eye,
  Copy,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { getSupabaseAdminBrowser } from "@/lib/supabase-client-admin";
import type { Order, Product, Category, Driver } from "@/types/database";
import type { Profile } from "@/types/profile";
import {
  type OrderStatus,
  type FulfillmentType,
  nextAdminOrderStatus,
  orderStatusTranslationKey,
} from "@/lib/order-status";
import {
  CANCELLATION_REASONS,
  cancellationReasonLabel,
} from "@/lib/cancellation-reasons";
import { InlineBanner } from "@/components/inline-banner";

const PAGE_SIZE = 10;

type AdminTab = "orders" | "customers" | "products" | "drivers";

// Fixed pill definitions — always shown regardless of order counts
type PillKey =
  | "pending"
  | "preparing"
  | "out_for_delivery"
  | "ready_for_pickup"
  | "completed_delivery"
  | "completed_pickup"
  | "cancelled";

const STATUS_PILLS: readonly {
  key: PillKey;
  status: string;
  fulfillment: FulfillmentType;
}[] = [
  { key: "pending", status: "pending", fulfillment: "delivery" },
  { key: "preparing", status: "preparing", fulfillment: "delivery" },
  { key: "out_for_delivery", status: "out_for_delivery", fulfillment: "delivery" },
  { key: "ready_for_pickup", status: "ready_for_pickup", fulfillment: "pickup" },
  { key: "completed_delivery", status: "completed", fulfillment: "delivery" },
  { key: "completed_pickup", status: "completed", fulfillment: "pickup" },
  { key: "cancelled", status: "cancelled", fulfillment: "delivery" },
];

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
  cancelled: XCircle,
};

const pillColors: Record<PillKey, { color: string; bg: string }> = {
  pending: { color: "text-amber-700", bg: "bg-amber-100" },
  preparing: { color: "text-blue-700", bg: "bg-blue-100" },
  out_for_delivery: { color: "text-purple-700", bg: "bg-purple-100" },
  ready_for_pickup: { color: "text-teal-800", bg: "bg-teal-100" },
  completed_delivery: { color: "text-emerald-800", bg: "bg-emerald-100" },
  completed_pickup: { color: "text-emerald-800", bg: "bg-emerald-100" },
  cancelled: { color: "text-red-700", bg: "bg-red-100" },
};

const rowStatusColors: Record<string, { color: string; bg: string }> = {
  pending: { color: "text-amber-700", bg: "bg-amber-100" },
  preparing: { color: "text-blue-700", bg: "bg-blue-100" },
  out_for_delivery: { color: "text-purple-700", bg: "bg-purple-100" },
  ready_for_pickup: { color: "text-teal-800", bg: "bg-teal-100" },
  completed: { color: "text-emerald-800", bg: "bg-emerald-100" },
  cancelled: { color: "text-red-700", bg: "bg-red-100" },
};

const rowStatusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  preparing: Package,
  out_for_delivery: Truck,
  ready_for_pickup: Store,
  completed: CheckCircle,
  cancelled: XCircle,
};

function orderMapHref(order: Order): string | null {
  const lat = Number(order.delivery_latitude);
  const lng = Number(order.delivery_longitude);
  const hasValidCoords =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001);

  if (hasValidCoords) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  const query = (order.delivery_formatted_address ?? order.delivery_address ?? "").trim();
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

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
  const [ordersQuery, setOrdersQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [copiedDriverLinkOrderId, setCopiedDriverLinkOrderId] = useState<string | null>(
    null
  );
  const [driverStatusConfirm, setDriverStatusConfirm] = useState<{
    order: Order;
    status: OrderStatus;
  } | null>(null);

  // Cancel modal
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelNotes, setCancelNotes] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // --- Customers ---
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersFetchFailed, setCustomersFetchFailed] = useState(false);
  const [customersNotice, setCustomersNotice] = useState<string | null>(null);
  const customersLoaded = useRef(false);
  const [customersVisible, setCustomersVisible] = useState(PAGE_SIZE);
  const [customersQuery, setCustomersQuery] = useState("");

  // --- Products (availability only) ---
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
      const [productsRes, categoriesRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
      ]);
      const productsData = await productsRes.json().catch(() => null);
      const categoriesData = await categoriesRes.json().catch(() => null);
      if (!productsRes.ok || !Array.isArray(productsData)) {
        setProductsFetchFailed(true);
        return;
      }
      setProducts(productsData);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
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

  function shouldConfirmDriverStatusChange(order: Order, newStatus: OrderStatus) {
    return (
      (order.fulfillment_type ?? "delivery") === "delivery" &&
      (newStatus === "out_for_delivery" || newStatus === "completed")
    );
  }

  function confirmDriverStatusMessage(newStatus: OrderStatus) {
    const statusLabel = t(
      orderStatusTranslationKey({
        status: newStatus,
        fulfillment_type: "delivery",
      })
    );
    return t("adminDriverStatusConfirm").replace("{status}", statusLabel);
  }

  function handleAdminStatusChange(order: Order, newStatus: OrderStatus) {
    if (shouldConfirmDriverStatusChange(order, newStatus)) {
      setDriverStatusConfirm({ order, status: newStatus });
      return;
    }
    void updateStatus(order.id, newStatus);
  }

  function paymentMethodLabel(paymentMethod: Order["payment_method"]) {
    if ((paymentMethod ?? "cash_on_delivery") === "cash_on_delivery") {
      return t("cashOnDelivery");
    }
    if (paymentMethod === "credit_card") return t("creditCard");
    return paymentMethod ?? t("cashOnDelivery");
  }

  function driverSharePath(order: Order): string | null {
    if (!order.delivery_token) return null;
    return `/delivery/accept/${encodeURIComponent(order.id)}?token=${encodeURIComponent(
      order.delivery_token
    )}`;
  }

  async function copyDriverLink(order: Order) {
    const path = driverSharePath(order);
    if (!path) return;

    try {
      const url = new URL(path, window.location.origin).toString();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedDriverLinkOrderId(order.id);
      setTimeout(() => {
        setCopiedDriverLinkOrderId((current) =>
          current === order.id ? null : current
        );
      }, 2500);
    } catch {
      setCopiedDriverLinkOrderId(null);
    }
  }

  function openCancelModal(order: Order) {
    setCancelOrder(order);
    setCancelReason("");
    setCancelNotes("");
    setCancelError(null);
  }

  function closeCancelModal() {
    if (cancelling) return;
    setCancelOrder(null);
    setCancelError(null);
  }

  async function submitCancel() {
    if (!cancelOrder || !cancelReason || cancelling) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/orders/${cancelOrder.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason, notes: cancelNotes }),
      });
      if (!res.ok) {
        setCancelError(t("orderCancelFailed"));
        return;
      }
      const updated = (await res.json()) as Order;
      setOrders((prev) =>
        prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
      );
      setCancelOrder(null);
    } catch {
      setCancelError(t("orderCancelFailed"));
    } finally {
      setCancelling(false);
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

  function pillLabel(pill: (typeof STATUS_PILLS)[number]): string {
    if (pill.key === "cancelled") return t("cancelled");
    return t(
      orderStatusTranslationKey({
        status: pill.status as OrderStatus,
        fulfillment_type: pill.fulfillment,
      })
    );
  }

  const filteredOrders = orders.filter((o) => {
    const normalizedQuery = ordersQuery.trim().toLowerCase();
    if (normalizedQuery) {
      const orderId = o.display_id.toLowerCase();
      const customerName = (o.customer_name ?? "").toLowerCase();
      const customerPhone = (o.customer_phone ?? "").toLowerCase();
      const queryMatch =
        orderId.includes(normalizedQuery) ||
        customerName.includes(normalizedQuery) ||
        customerPhone.includes(normalizedQuery);
      if (!queryMatch) return false;
    }

    const ft: FulfillmentType =
      (o.fulfillment_type ?? "delivery") === "pickup" ? "pickup" : "delivery";
    if (o.status === "cancelled") return activePills.has("cancelled");
    if (o.status === "completed") {
      return activePills.has(
        ft === "delivery" ? "completed_delivery" : "completed_pickup"
      );
    }
    return activePills.has(o.status as PillKey);
  });

  const visibleOrders = filteredOrders.slice(0, ordersVisible);
  const filteredCustomers = customers.filter((customer) => {
    const normalizedQuery = customersQuery.trim().toLowerCase();
    if (!normalizedQuery) return true;
    const name = (customer.full_name ?? "").toLowerCase();
    const phone = (customer.phone ?? "").toLowerCase();
    return name.includes(normalizedQuery) || phone.includes(normalizedQuery);
  });
  const visibleCustomers = filteredCustomers.slice(0, customersVisible);
  const visibleProducts = products.slice(0, productsVisible);
  const visibleDrivers = drivers.slice(0, driversVisible);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;

  function categoryDisplayName(categoryId: string | null | undefined) {
    const category = categories.find((cat) => cat.id === categoryId);
    if (!category) return "—";
    return locale === "ar" && category.name_ar ? category.name_ar : category.name;
  }

  function productDisplayName(product: Product) {
    return locale === "ar" && product.name_ar ? product.name_ar : product.name;
  }

  const tabs: { key: AdminTab; label: string }[] = [
    { key: "orders", label: t("orders") },
    { key: "customers", label: t("customers") },
    { key: "products", label: t("products") },
    { key: "drivers", label: t("drivers") },
  ];
  const driverStatusConfirmLabel = driverStatusConfirm
    ? t(
        orderStatusTranslationKey({
          status: driverStatusConfirm.status,
          fulfillment_type: "delivery",
        })
      )
    : "";

  return (
    <>
      {/* Driver-owned status confirmation modal */}
      {driverStatusConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal
          aria-labelledby="driver-status-confirm-title"
        >
          <div className="w-full max-w-md rounded-xl border border-admin-border bg-admin-panel p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3
                id="driver-status-confirm-title"
                className="font-semibold text-admin-ink"
              >
                {t("confirmStatusChange")}
              </h3>
              <button
                type="button"
                onClick={() => setDriverStatusConfirm(null)}
                className="rounded-lg p-1 text-admin-muted hover:bg-[rgba(31,68,60,0.06)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950">
              <p className="font-semibold">
                {driverStatusConfirm.order.display_id} → {driverStatusConfirmLabel}
              </p>
              <p className="mt-2">
                {confirmDriverStatusMessage(driverStatusConfirm.status)}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDriverStatusConfirm(null)}
                className="rounded-lg border border-admin-border px-4 py-2 text-sm font-medium text-admin-muted transition-colors hover:bg-[rgba(31,68,60,0.06)]"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  const pending = driverStatusConfirm;
                  setDriverStatusConfirm(null);
                  void updateStatus(pending.order.id, pending.status);
                }}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-[#102820] transition-colors hover:brightness-105"
              >
                {t("confirmStatusChangeAction")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel order modal */}
      {cancelOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal
          aria-labelledby="cancel-order-title"
        >
          <div className="w-full max-w-md rounded-xl border border-admin-border bg-admin-panel p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3
                id="cancel-order-title"
                className="font-semibold text-admin-ink"
              >
                {t("cancelOrderTitle")} — {cancelOrder.display_id}
              </h3>
              <button
                type="button"
                onClick={closeCancelModal}
                disabled={cancelling}
                className="rounded-lg p-1 text-admin-muted hover:bg-[rgba(31,68,60,0.06)] disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-4 text-sm text-admin-muted">
              {t("cancelOrderConfirm")}
            </p>

            {cancelError && (
              <div className="mb-4">
                <InlineBanner variant="error">
                  <p>{cancelError}</p>
                </InlineBanner>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-admin-muted">
                  {t("cancellationReason")}
                  <span className="ms-1 text-red-500">*</span>
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  disabled={cancelling}
                  className="admin-input"
                >
                  <option value="">{t("cancellationReasonPlaceholder")}</option>
                  {CANCELLATION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {cancellationReasonLabel(r, locale)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-admin-muted">
                  {t("cancellationNotes")}
                </label>
                <textarea
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  disabled={cancelling}
                  rows={3}
                  placeholder={t("cancellationNotesPlaceholder")}
                  className="admin-input resize-none"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeCancelModal}
                disabled={cancelling}
                className="rounded-lg border border-admin-border px-4 py-2 text-sm font-medium text-admin-muted transition-colors hover:bg-[rgba(31,68,60,0.06)] disabled:opacity-50"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={() => void submitCancel()}
                disabled={!cancelReason || cancelling}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelling ? (
                  <span className="inline-flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    {t("cancelOrder")}
                  </span>
                ) : (
                  t("cancelOrder")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order details modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal
          aria-labelledby="order-details-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-admin-border bg-admin-panel p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 id="order-details-title" className="font-semibold text-admin-ink">
                {t("orderDetails")} — {selectedOrder.display_id}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedOrderId(null)}
                className="rounded-lg p-1 text-admin-muted hover:bg-[rgba(31,68,60,0.06)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4 grid gap-3 rounded-lg border border-admin-border bg-[#1F443C]/[0.03] p-4 text-sm sm:grid-cols-2">
              <p className="text-admin-muted">
                <span className="font-semibold text-admin-ink">{t("customer")}:</span>{" "}
                {selectedOrder.customer_name}
              </p>
              <p className="text-admin-muted">
                <span className="font-semibold text-admin-ink">{t("phone")}:</span>{" "}
                {selectedOrder.customer_phone ?? "—"}
              </p>
              <p className="text-admin-muted">
                <span className="font-semibold text-admin-ink">{t("status")}:</span>{" "}
                {selectedOrder.status === "cancelled"
                  ? t("cancelled")
                  : t(
                      orderStatusTranslationKey({
                        status: selectedOrder.status as OrderStatus,
                        fulfillment_type: selectedOrder.fulfillment_type,
                      })
                    )}
              </p>
              <p className="text-admin-muted">
                <span className="font-semibold text-admin-ink">{t("total")}:</span> ₪
                {selectedOrder.total_price.toFixed(2)}
              </p>
              <p className="text-admin-muted">
                <span className="font-semibold text-admin-ink">{t("adminPaymentMethod")}:</span>{" "}
                {paymentMethodLabel(selectedOrder.payment_method)}
              </p>
              <p className="sm:col-span-2 text-admin-muted">
                <span className="font-semibold text-admin-ink">{t("adminFulfillment")}:</span>{" "}
                {(selectedOrder.fulfillment_type ?? "delivery") === "pickup"
                  ? t("fulfillmentPickup")
                  : t("fulfillmentDelivery")}
              </p>
              {(selectedOrder.fulfillment_type ?? "delivery") === "delivery" &&
                selectedOrder.delivery_address && (
                  <p className="sm:col-span-2 text-admin-muted">
                    <span className="font-semibold text-admin-ink">
                      {t("adminDeliveryAddress")}:
                    </span>{" "}
                    {selectedOrder.delivery_address}
                    {orderMapHref(selectedOrder) ? (
                      <a
                        href={orderMapHref(selectedOrder) ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="ms-2 inline-flex text-xs font-semibold text-primary-dark hover:underline"
                      >
                        {t("openInMap")}
                      </a>
                    ) : null}
                  </p>
                )}
            </div>
            <div className="rounded-lg border border-admin-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="admin-table-head text-start">
                    <th className="px-4 py-2 text-start font-semibold text-admin-muted">
                      {t("items")}
                    </th>
                    <th className="px-4 py-2 text-start font-semibold text-admin-muted">
                      {t("qty")}
                    </th>
                    <th className="px-4 py-2 text-start font-semibold text-admin-muted">
                      {t("subtotal")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {selectedOrder.items.map((item, index) => (
                    <tr key={`${item.product_id}-${index}`}>
                      <td className="px-4 py-2 text-admin-ink">
                        {locale === "ar" && item.product_name_ar
                          ? item.product_name_ar
                          : item.product_name}
                      </td>
                      <td className="px-4 py-2 text-admin-muted">{item.quantity}</td>
                      <td className="px-4 py-2 text-admin-muted">
                        ₪{(item.unit_price * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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

      {/* Tab nav — scroll on narrow viewports to avoid horizontal page overflow */}
      <div className="mb-6 flex w-full min-w-0 max-w-full flex-nowrap gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-admin-border bg-admin-panel p-1 [-webkit-overflow-scrolling:touch]">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleTabChange(key)}
            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:px-4 ${
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
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-admin-muted">
              {t("searchOrders")}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-admin-muted/70" />
              <input
                type="text"
                value={ordersQuery}
                onChange={(e) => {
                  setOrdersQuery(e.target.value);
                  setOrdersVisible(PAGE_SIZE);
                }}
                placeholder={t("searchOrdersPlaceholder")}
                className="admin-input ps-9"
              />
            </div>
          </div>
          {/* Fixed status filter pills */}
          <div className="mb-4 flex flex-wrap gap-2">
            {STATUS_PILLS.map((pill) => {
              const Icon = pillIcons[pill.key];
              const colors = pillColors[pill.key];
              const isActive = activePills.has(pill.key);
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
                  {pillLabel(pill)}
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
                    const tKey =
                      order.status === "cancelled"
                        ? null
                        : orderStatusTranslationKey({
                            status: order.status as OrderStatus,
                            fulfillment_type: order.fulfillment_type,
                          });
                    const nextStatus = nextAdminOrderStatus({
                      current: order.status as OrderStatus | "cancelled",
                      fulfillment,
                    });
                    const nextStatusColor = nextStatus
                      ? (rowStatusColors[nextStatus] ?? rowStatusColors.pending).color
                      : "";
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
                          {fulfillment === "pickup"
                            ? t("fulfillmentPickup")
                            : t("fulfillmentDelivery")}
                        </td>
                        <td className="max-w-[12rem] whitespace-pre-wrap break-words px-4 py-3 text-admin-muted">
                          {fulfillment === "delivery" && order.delivery_address ? (
                            <div className="space-y-1">
                              <p>{order.delivery_address}</p>
                              {orderMapHref(order) ? (
                                <a
                                  href={orderMapHref(order) ?? "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex text-xs font-semibold text-primary-dark hover:underline"
                                >
                                  {t("openInMap")}
                                </a>
                              ) : null}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-admin-muted">
                          {paymentMethodLabel(order.payment_method)}
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
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${colors.bg} ${colors.color}`}
                            >
                              <Icon className="h-3 w-3" />
                              {tKey ? t(tKey) : t("cancelled")}
                            </span>
                            {order.status === "cancelled" && order.cancellation_reason && (
                              <span className="text-[11px] text-admin-muted">
                                {cancellationReasonLabel(order.cancellation_reason, locale)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5">
                            {nextStatus ? (
                              <button
                                type="button"
                                onClick={() => handleAdminStatusChange(order, nextStatus)}
                                className="inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-lg border border-admin-border bg-white px-2.5 py-1.5 text-xs font-medium text-admin-ink transition-colors hover:border-primary/40 hover:bg-[rgba(211,169,76,0.08)]"
                              >
                                <CheckCircle className="h-3 w-3" />
                                <span>
                                  {t("markAs")}{" "}
                                  <span className={nextStatusColor}>
                                    {t(
                                      orderStatusTranslationKey({
                                        status: nextStatus,
                                        fulfillment_type: order.fulfillment_type,
                                      })
                                    )}
                                  </span>
                                </span>
                              </button>
                            ) : null}
                            {nextStatus ? (
                              <button
                                type="button"
                                onClick={() => openCancelModal(order)}
                                className="inline-flex w-fit items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                              >
                                <XCircle className="h-3 w-3" />
                                {t("cancelOrder")}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => setSelectedOrderId(order.id)}
                              className="inline-flex w-fit items-center gap-1 rounded-lg border border-admin-border px-2.5 py-1.5 text-xs font-medium text-admin-ink transition-colors hover:bg-[rgba(31,68,60,0.06)]"
                            >
                              <Eye className="h-3 w-3" />
                              {t("viewDetails")}
                            </button>
                            {(order.fulfillment_type ?? "delivery") === "delivery" ? (
                              <button
                                type="button"
                                onClick={() => void copyDriverLink(order)}
                                className="inline-flex w-fit items-center gap-1 rounded-lg border border-admin-border px-2.5 py-1.5 text-xs font-medium text-admin-ink transition-colors hover:bg-[rgba(31,68,60,0.06)]"
                              >
                                <Copy className="h-3 w-3" />
                                {copiedDriverLinkOrderId === order.id
                                  ? t("driverLinkCopied")
                                  : t("copyDriverLink")}
                              </button>
                            ) : null}
                          </div>
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
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-admin-muted">
              {t("searchCustomers")}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-admin-muted/70" />
              <input
                type="text"
                value={customersQuery}
                onChange={(e) => {
                  setCustomersQuery(e.target.value);
                  setCustomersVisible(PAGE_SIZE);
                }}
                placeholder={t("searchCustomersPlaceholder")}
                className="admin-input ps-9"
              />
            </div>
          </div>
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
          {customersNotice && (
            <div className="mb-4">
              <InlineBanner variant="warning">
                <p>{customersNotice}</p>
              </InlineBanner>
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
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">{t("orderHistory")}</th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {visibleCustomers.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 font-medium text-admin-ink">{c.full_name || "—"}</td>
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
                      <td className="px-4 py-3 text-admin-muted">{c.preferred_language ?? "—"}</td>
                      <td className="px-4 py-3 text-admin-muted">
                        <p className="mb-1 text-xs font-semibold text-admin-ink">
                          {t("customerOrdersLabel")}: {c.order_count ?? 0}
                        </p>
                        {c.recent_orders && c.recent_orders.length > 0 ? (
                          <div className="space-y-1 text-xs">
                            {c.recent_orders.map((order) => (
                              <div key={order.id} className="flex items-center gap-2">
                                <span className="font-medium text-admin-ink">{order.display_id}</span>
                                <span className="text-admin-muted">₪{order.total_price.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-admin-muted/70">{t("noOrders")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setCustomersNotice(t("blacklistComingSoon"))}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100"
                        >
                          {t("blacklistCustomer")}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {customersLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-admin-muted">
                        <RefreshCw className="mx-auto h-5 w-5 animate-spin opacity-50" />
                      </td>
                    </tr>
                  )}
                  {!customersLoading && customers.length === 0 && !customersFetchFailed && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-admin-muted">
                        {t("noCustomers")}
                      </td>
                    </tr>
                  )}
                  {!customersLoading &&
                    customers.length > 0 &&
                    filteredCustomers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-admin-muted">
                          {t("noCustomersMatchSearch")}
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
          {filteredCustomers.length > customersVisible && (
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
                      <span>{productDisplayName(product)}</span>
                      <span className="ms-1 text-xs font-normal text-admin-muted">
                        ({categoryDisplayName(product.category_id)})
                      </span>
                    </p>
                    <p className="text-xs text-admin-muted">₪{product.price.toFixed(2)}</p>
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
                    {product.unavailable_today ? t("unavailableToday") : t("available")}
                  </button>
                </div>
                {availabilityErrors[product.id] ? (
                  <p className="text-xs font-medium text-red-600">{availabilityErrors[product.id]}</p>
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
                      <td className="px-4 py-3 font-medium text-admin-ink">{driver.name}</td>
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
