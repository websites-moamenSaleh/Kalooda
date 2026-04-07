import type { Product } from "@/types/database";

export type StorefrontCatalogBroadcastPayload = {
  action: "INSERT" | "UPDATE" | "DELETE";
  product?: Product;
  id?: string;
};
