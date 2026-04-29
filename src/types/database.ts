import type { CartLineOptionsPersisted } from "@/lib/product-options/types";

export interface Category {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  image_url: string | null;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  /** Nullable in API/DB; normalize at boundaries when a non-null string is required. */
  ingredients: string | null;
  allergens: string[];
  image_url: string;
  name_ar: string | null;
  description_ar: string | null;
  ingredients_ar: string | null;
  allergens_ar: string[] | null;
  unavailable_today: boolean;
  base_price?: number;
  effective_price?: number;
  active_sale?: {
    id: string;
    name: string;
    start_at: string;
    end_at: string;
    discount_type: "amount" | "percentage";
    discount_value: number;
  } | null;
  /** True when product has at least one row in product_options_junction (storefront). */
  has_options?: boolean;
}

export interface Order {
  id: string;
  display_id: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  items: OrderItem[];
  total_price: number;
  status:
    | "pending"
    | "preparing"
    | "out_for_delivery"
    | "ready_for_pickup"
    | "completed"
    | "cancelled";
  created_at: string;
  delivery_token: string;
  delivery_token_expires_at?: string | null;
  /** Present after checkout fulfillment migration; treat missing as delivery. */
  fulfillment_type?: "delivery" | "pickup";
  delivery_address?: string | null;
  payment_method?: "cash_on_delivery" | "credit_card" | string | null;
  customer_address_id?: string | null;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  delivery_formatted_address?: string | null;
  cancellation_reason?: string | null;
  cancellation_notes?: string | null;
}

export interface CustomerAddress {
  id: string;
  user_id: string;
  label: string | null;
  label_type: "home" | "work" | "other" | null;
  custom_label: string | null;
  city: string;
  street_line: string;
  building_number: string;
  formatted_address: string;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessSettings {
  id: true;
  pickup_name: string | null;
  pickup_address: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  updated_at: string;
  updated_by: string | null;
}

export interface CartItemRow {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  line_options: CartLineOptionsPersisted | unknown;
  updated_at: string;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  product_name_ar?: string | null;
  quantity: number;
  unit_price: number;
  image_url?: string | null;
  /** Configured product snapshot (issue #123); omitted on legacy orders. */
  line_options?: CartLineOptionsPersisted | null;
}

export interface Delivery {
  id: string;
  order_id: string;
  driver_name: string;
  driver_phone: string;
  status: "accepted" | "declined";
  timestamp: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string | null;
  created_at: string;
}

export interface CartItem {
  lineId: string;
  product: Product;
  quantity: number;
  /** Set when the line used the options wizard; simple adds use empty selections. */
  line_options?: CartLineOptionsPersisted | null;
}
