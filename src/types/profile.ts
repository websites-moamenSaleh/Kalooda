export interface Profile {
  id: string;
  role: "customer" | "admin" | "super_admin";
  full_name: string | null;
  phone: string | null;
  preferred_language: "en" | "ar" | null;
  /** Saved checkout address; null if never set. */
  delivery_address?: string | null;
}
