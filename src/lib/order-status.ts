import type { TranslationKey } from "@/lib/translations";

export const ORDER_STATUSES = [
  "pending",
  "preparing",
  "out_for_delivery",
  "ready_for_pickup",
  "completed",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Tailwind classes for status pills (shared by admin dashboard and customer UI). */
export type OrderStatusBadgeColors = { color: string; bg: string };

export const orderStatusBadgeColors: Record<OrderStatus, OrderStatusBadgeColors> =
  {
    pending: { color: "text-amber-700", bg: "bg-amber-100" },
    preparing: { color: "text-blue-700", bg: "bg-blue-100" },
    out_for_delivery: { color: "text-purple-700", bg: "bg-purple-100" },
    ready_for_pickup: { color: "text-teal-800", bg: "bg-teal-100" },
    completed: { color: "text-emerald-800", bg: "bg-emerald-100" },
  };

export type FulfillmentType = "delivery" | "pickup";

const DELIVERY_FLOW: OrderStatus[] = [
  "pending",
  "preparing",
  "out_for_delivery",
  "completed",
];

const PICKUP_FLOW: OrderStatus[] = [
  "pending",
  "preparing",
  "ready_for_pickup",
  "completed",
];

export function orderStatusFlow(fulfillment: FulfillmentType): OrderStatus[] {
  return fulfillment === "delivery" ? DELIVERY_FLOW : PICKUP_FLOW;
}

export function isValidStatusForFulfillment(
  status: OrderStatus,
  fulfillment: FulfillmentType
): boolean {
  return orderStatusFlow(fulfillment).includes(status);
}

/** Admin: forward-only along the fulfillment chain; no edits after completed or cancelled. */
export function canAdminSetStatus(params: {
  from: OrderStatus | "cancelled";
  to: OrderStatus;
  fulfillment: FulfillmentType;
}): boolean {
  const { from, to, fulfillment } = params;
  if (from === "completed" || (from as string) === "cancelled") return false;
  if (from === to) return true;
  if (!isValidStatusForFulfillment(to, fulfillment)) return false;

  const flow = orderStatusFlow(fulfillment);
  const iFrom = flow.indexOf(from as OrderStatus);
  const iTo = flow.indexOf(to);

  if (iFrom === -1) {
    return true;
  }
  return iTo > iFrom;
}

/** Driver magic-link: only the driver-owned delivery steps. */
export function canTokenSetStatus(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  return (
    (from === "preparing" && to === "out_for_delivery") ||
    (from === "out_for_delivery" && to === "completed")
  );
}

export function adminSelectableStatuses(params: {
  current: OrderStatus | "cancelled";
  fulfillment: FulfillmentType;
}): OrderStatus[] {
  const { current, fulfillment } = params;
  if (current === "completed" || (current as string) === "cancelled") {
    return [current as OrderStatus];
  }
  const flow = orderStatusFlow(fulfillment);
  const i = flow.indexOf(current as OrderStatus);
  if (i === -1) {
    return [...flow];
  }
  return flow.slice(i);
}

export function nextAdminOrderStatus(params: {
  current: OrderStatus | "cancelled";
  fulfillment: FulfillmentType;
}): OrderStatus | null {
  const { current, fulfillment } = params;
  if (current === "completed" || (current as string) === "cancelled") return null;
  const flow = orderStatusFlow(fulfillment);
  const i = flow.indexOf(current as OrderStatus);
  if (i === -1 || i >= flow.length - 1) return null;
  return flow[i + 1];
}

export function orderStatusTranslationKey(params: {
  status: OrderStatus;
  fulfillment_type?: FulfillmentType | null;
}): TranslationKey {
  const { status, fulfillment_type } = params;
  const ft: FulfillmentType =
    fulfillment_type === "pickup" ? "pickup" : "delivery";

  if (status === "completed") {
    return ft === "delivery"
      ? "orderStatusDelivered"
      : "orderStatusCompletedPickup";
  }
  if (status === "ready_for_pickup") {
    return "readyForPickup";
  }
  if (status === "out_for_delivery") {
    return "outForDelivery";
  }
  if (status === "preparing") {
    return "preparing";
  }
  return "pending";
}
