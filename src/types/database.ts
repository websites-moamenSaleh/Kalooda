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
  stock_quantity: number;
  ingredients: string;
  allergens: string[];
  image_url: string;
  name_ar: string | null;
  description_ar: string | null;
  ingredients_ar: string | null;
  allergens_ar: string[] | null;
  unavailable_today: boolean;
}

export interface Order {
  id: string;
  display_id: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  items: OrderItem[];
  total_price: number;
  status: "pending" | "preparing" | "out_for_delivery";
  created_at: string;
  delivery_token: string;
}

export interface CartItemRow {
  user_id: string;
  product_id: string;
  quantity: number;
  updated_at: string;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  product_name_ar?: string | null;
  quantity: number;
  unit_price: number;
  image_url?: string | null;
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
  product: Product;
  quantity: number;
}
