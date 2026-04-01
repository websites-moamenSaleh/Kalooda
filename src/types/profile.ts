export interface Profile {
  id: string;
  role: "customer" | "admin" | "super_admin";
  full_name: string | null;
  phone: string | null;
}
