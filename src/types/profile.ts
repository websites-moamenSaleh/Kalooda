export interface Profile {
  id: string;
  role: "customer" | "admin" | "super_admin";
  full_name: string | null;
  phone: string | null;
  preferred_language: "en" | "ar" | null;
  /** Saved checkout address; null if never set. */
  delivery_address?: string | null;
  /** Address book rows fetched from customer_addresses when needed. */
  addresses?: {
    id: string;
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
  }[];
  /** Admin customers view only. */
  order_count?: number;
  /** Admin customers view only. */
  recent_orders?: {
    id: string;
    display_id: string;
    total_price: number;
    status: string;
    created_at: string;
  }[];
}
