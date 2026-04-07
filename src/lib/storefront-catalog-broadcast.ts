import { getSupabaseAdmin } from "@/lib/supabase-server";
import {
  STOREFRONT_CATALOG_BROADCAST_EVENT,
  STOREFRONT_CATALOG_CHANNEL,
} from "@/lib/storefront-catalog-constants";
import type { StorefrontCatalogBroadcastPayload } from "@/lib/storefront-catalog-types";

export type { StorefrontCatalogBroadcastPayload } from "@/lib/storefront-catalog-types";

/**
 * Push a catalog change to all connected storefront clients via Realtime Broadcast.
 * Does not require `products` to be in the `supabase_realtime` publication.
 */
export async function broadcastStorefrontCatalog(
  data: StorefrontCatalogBroadcastPayload
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const channel = supabase.channel(STOREFRONT_CATALOG_CHANNEL);
    await channel.send({
      type: "broadcast",
      event: STOREFRONT_CATALOG_BROADCAST_EVENT,
      payload: data,
    });
  } catch (e) {
    console.error("broadcastStorefrontCatalog:", e);
  }
}
