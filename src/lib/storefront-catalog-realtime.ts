import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseCustomerBrowser } from "@/lib/supabase-client-customer";
import {
  STOREFRONT_CATALOG_BROADCAST_EVENT,
  STOREFRONT_CATALOG_CHANNEL,
} from "@/lib/storefront-catalog-constants";
import type { ProductsPostgresChangePayload } from "@/lib/realtime-products";
import type { StorefrontCatalogBroadcastPayload } from "@/lib/storefront-catalog-types";

export type StorefrontCatalogRealtimeEvent =
  | { type: "postgres"; payload: ProductsPostgresChangePayload }
  | { type: "broadcast"; data: StorefrontCatalogBroadcastPayload };

const listeners = new Set<(e: StorefrontCatalogRealtimeEvent) => void>();
let sharedChannel: RealtimeChannel | null = null;

function emit(event: StorefrontCatalogRealtimeEvent) {
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch {
      /* listener isolation */
    }
  });
}

function normalizePostgresPayload(
  raw: Record<string, unknown>
): ProductsPostgresChangePayload | null {
  const et = raw.eventType ?? raw.event;
  const eventType =
    et === "INSERT" || et === "UPDATE" || et === "DELETE" ? et : null;
  if (!eventType) return null;
  return {
    eventType,
    new: (raw.new as Record<string, unknown> | null | undefined) ?? null,
    old: (raw.old as Record<string, unknown> | null | undefined) ?? null,
  };
}

function ensureChannelSubscribed() {
  if (sharedChannel) return;

  const supabase = getSupabaseCustomerBrowser();
  sharedChannel = supabase
    .channel(STOREFRONT_CATALOG_CHANNEL)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "products" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (raw: any) => {
        const payload = normalizePostgresPayload(raw as Record<string, unknown>);
        if (payload) emit({ type: "postgres", payload });
      }
    )
    .on(
      "broadcast",
      { event: STOREFRONT_CATALOG_BROADCAST_EVENT },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (msg: any) => {
        const inner =
          msg?.payload && typeof msg.payload === "object"
            ? msg.payload
            : msg;
        if (
          !inner ||
          typeof inner !== "object" ||
          (inner.action !== "INSERT" &&
            inner.action !== "UPDATE" &&
            inner.action !== "DELETE")
        ) {
          return;
        }
        emit({
          type: "broadcast",
          data: inner as StorefrontCatalogBroadcastPayload,
        });
      }
    )
    .subscribe();
}

/**
 * Single shared Realtime channel for the storefront: `postgres_changes` on `products`
 * (when the table is in the publication) plus `broadcast` from API routes (always).
 */
export function subscribeStorefrontCatalog(
  listener: (e: StorefrontCatalogRealtimeEvent) => void
): () => void {
  listeners.add(listener);
  ensureChannelSubscribed();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && sharedChannel) {
      const supabase = getSupabaseCustomerBrowser();
      void supabase.removeChannel(sharedChannel);
      sharedChannel = null;
    }
  };
}
