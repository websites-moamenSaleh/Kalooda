"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Clock,
  Truck,
  Package,
  Users,
  Phone,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { getSupabaseAdminBrowser } from "@/lib/supabase-client-admin";
import type { Order, Product, Driver } from "@/types/database";

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  preparing: Package,
  out_for_delivery: Truck,
};

const statusColors: Record<string, { color: string; bg: string }> = {
  pending: { color: "text-amber-700", bg: "bg-amber-100" },
  preparing: { color: "text-blue-700", bg: "bg-blue-100" },
  out_for_delivery: { color: "text-purple-700", bg: "bg-purple-100" },
};

const statusTranslationKeys: Record<
  string,
  "pending" | "preparing" | "outForDelivery"
> = {
  pending: "pending",
  preparing: "preparing",
  out_for_delivery: "outForDelivery",
};

export default function AdminDashboard() {
  const { t, locale } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [flashId, setFlashId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  }, []);

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await fetch("/api/drivers");
      const data = await res.json();
      if (Array.isArray(data)) setDrivers(data);
    } catch (err) {
      console.error("Failed to fetch drivers:", err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchDrivers();

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
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, fetchProducts, fetchDrivers]);

  async function updateStatus(orderId: string, newStatus: string) {
    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: newStatus as Order["status"] }
            : o
        )
      );
      setFlashId(orderId);
      setTimeout(() => setFlashId(null), 3000);
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  }

  async function toggleAvailability(product: Product) {
    const next = !product.unavailable_today;
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, unavailable_today: next } : p
      )
    );
    try {
      await fetch(`/api/products/${product.id}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unavailable_today: next }),
      });
    } catch {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, unavailable_today: !next } : p
        )
      );
    }
  }

  const statusKeys = ["pending", "preparing", "out_for_delivery"] as const;

  return (
    <>
      {/* Refresh button */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-admin-ink">
          {t("adminDashboard")}
        </h1>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            fetchOrders();
            fetchProducts();
            fetchDrivers();
          }}
          className="rounded-lg border border-admin-border bg-admin-panel p-2 text-admin-muted transition-colors hover:bg-[rgba(31, 68, 60,0.05)]"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statusKeys.map((key) => {
          const count = orders.filter((o) => o.status === key).length;
          const Icon = statusIcons[key];
          const colors = statusColors[key];
          const tKey = statusTranslationKeys[key];
          return (
            <div
              key={key}
              className="rounded-xl border border-admin-border bg-admin-panel p-5 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border border-admin-border ${colors.bg}`}
                >
                  <Icon className={`h-4 w-4 ${colors.color}`} />
                </div>
                <span className="text-sm font-semibold text-admin-muted">
                  {t(tKey)}
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-admin-ink">
                {count}
              </p>
            </div>
          );
        })}
      </div>

      {/* Orders table */}
      <div className="overflow-hidden rounded-xl border border-admin-border bg-admin-panel shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="admin-table-head text-start">
                <th className="px-4 py-3 font-semibold text-admin-muted text-start">
                  {t("order")}
                </th>
                <th className="px-4 py-3 font-semibold text-admin-muted text-start">
                  {t("customer")}
                </th>
                <th className="px-4 py-3 font-semibold text-admin-muted text-start">
                  {t("items")}
                </th>
                <th className="px-4 py-3 font-semibold text-admin-muted text-start">
                  {t("total")}
                </th>
                <th className="px-4 py-3 font-semibold text-admin-muted text-start">
                  {t("status")}
                </th>
                <th className="px-4 py-3 font-semibold text-admin-muted text-start">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border">
              {orders.map((order) => {
                const colors =
                  statusColors[order.status] ?? statusColors.pending;
                const Icon = statusIcons[order.status] ?? Clock;
                const tKey =
                  statusTranslationKeys[order.status] ?? "pending";
                return (
                  <tr
                    key={order.id}
                    className={`transition-colors ${
                      flashId === order.id
                        ? "pulse-green bg-emerald-50"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-admin-ink">
                      {order.display_id}
                    </td>
                    <td className="px-4 py-3 text-admin-ink">
                      {order.customer_name}
                    </td>
                    <td className="px-4 py-3 text-admin-muted">
                      {order.items
                        .map(
                          (i) => `${locale === "ar" && i.product_name_ar ? i.product_name_ar : i.product_name} (x${i.quantity})`
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
                        onChange={(e) =>
                          updateStatus(order.id, e.target.value)
                        }
                        className="admin-input max-w-[11rem] px-2 py-1.5 text-xs"
                      >
                        <option value="pending">{t("pending")}</option>
                        <option value="preparing">{t("preparing")}</option>
                        <option value="out_for_delivery">
                          {t("outForDelivery")}
                        </option>
                      </select>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-admin-muted"
                  >
                    {t("noOrders")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product availability toggles */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-admin-ink">
          {t("productAvailability")}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className={`flex items-center justify-between rounded-xl border p-4 shadow-sm transition-colors ${
                product.unavailable_today
                  ? "border-red-200 bg-red-50/80"
                  : "border-admin-border bg-admin-panel"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-admin-ink">
                  {product.name}
                </p>
                <p className="text-xs text-admin-muted">
                  ₪{product.price.toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => toggleAvailability(product)}
                className={`ms-3 shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
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
          ))}
          {products.length === 0 && (
            <p className="col-span-full py-8 text-center text-admin-muted">
              {t("noProductsYet")}
            </p>
          )}
        </div>
      </div>

      {/* Read-only drivers list */}
      <div className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-admin-border bg-admin-panel">
            <Users className="h-4 w-4 text-admin-muted" />
          </div>
          <h2 className="text-lg font-semibold text-admin-ink">
            {t("drivers")}
          </h2>
        </div>
        <div className="overflow-hidden rounded-xl border border-admin-border bg-admin-panel shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="admin-table-head text-start">
                  <th className="px-4 py-3 font-semibold text-admin-muted text-start">
                    {t("driverName")}
                  </th>
                  <th className="px-4 py-3 font-semibold text-admin-muted text-start">
                    {t("driverPhone")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {drivers.map((driver) => (
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
                {drivers.length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-12 text-center text-admin-muted"
                    >
                      {t("noDrivers")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
