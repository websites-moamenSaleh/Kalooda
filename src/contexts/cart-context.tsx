"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/auth-context";
import { GUEST_CART_KEY } from "@/lib/guest-cart-constants";
import type { Product, CartItem } from "@/types/database";

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  clearRemoteCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
  cartReady: boolean;
}

const CartContext = createContext<CartContextType | null>(null);

function readGuestCartRaw(): { product_id: string; quantity: number }[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => ({
        product_id: String((x as { product_id?: string }).product_id ?? ""),
        quantity: Math.floor(
          Number((x as { quantity?: number }).quantity) || 0
        ),
      }))
      .filter((x) => x.product_id && x.quantity > 0);
  } catch {
    return [];
  }
}

function writeGuestCartRaw(items: CartItem[]) {
  const raw = items.map((i) => ({
    product_id: i.product.id,
    quantity: i.quantity,
  }));
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(raw));
}

async function putRemoteCart(
  payload: { product_id: string; quantity: number }[],
  signal: AbortSignal
) {
  const res = await fetch("/api/cart", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    signal,
    body: JSON.stringify({ items: payload }),
  });
  if (!res.ok) throw new Error("cart_put_failed");
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const userIdRef = useRef<string | null>(null);
  const remoteHydratedRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncRunningRef = useRef(false);
  const syncQueuedRef = useRef(false);

  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const flushRemote = useCallback(async () => {
    if (!userIdRef.current || !remoteHydratedRef.current) return;

    const runLoop = async () => {
      while (true) {
        syncRunningRef.current = true;
        syncQueuedRef.current = false;
        const snapshot = itemsRef.current.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        }));
        try {
          await putRemoteCart(snapshot, new AbortController().signal);
        } catch {
          /* network */
        }
        syncRunningRef.current = false;
        if (!syncQueuedRef.current) break;
      }
    };

    if (syncRunningRef.current) {
      syncQueuedRef.current = true;
      return;
    }
    await runLoop();
  }, []);

  const schedulePersist = useCallback(() => {
    clearDebounce();
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      if (userIdRef.current && remoteHydratedRef.current) {
        void flushRemote();
      } else {
        writeGuestCartRaw(itemsRef.current);
      }
    }, 450);
  }, [clearDebounce, flushRemote]);

  const clearRemoteCart = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    clearDebounce();
    syncQueuedRef.current = false;
    try {
      await putRemoteCart([], new AbortController().signal);
    } catch {
      /* still clear local */
    }
  }, [clearDebounce]);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    clearDebounce();
    remoteHydratedRef.current = false;
    setCartReady(false);

    if (!user?.id) {
      userIdRef.current = null;
      (async () => {
        const raw = readGuestCartRaw();
        if (raw.length === 0) {
          if (!cancelled) {
            setItems([]);
            itemsRef.current = [];
            remoteHydratedRef.current = true;
            setCartReady(true);
          }
          return;
        }
        try {
          const res = await fetch("/api/products");
          const products = (await res.json()) as Product[];
          if (cancelled) return;
          const map = new Map(products.map((p) => [p.id, p]));
          const built: CartItem[] = [];
          for (const line of raw) {
            const p = map.get(line.product_id);
            if (p && !p.unavailable_today) {
              built.push({ product: p, quantity: line.quantity });
            }
          }
          setItems(built);
          itemsRef.current = built;
        } catch {
          if (!cancelled) {
            setItems([]);
            itemsRef.current = [];
          }
        }
        if (!cancelled) {
          remoteHydratedRef.current = true;
          setCartReady(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    const uid = user.id;
    userIdRef.current = uid;

    (async () => {
      const guestLines = readGuestCartRaw();
      let serverItems: CartItem[] = [];
      try {
        const res = await fetch("/api/cart", { credentials: "same-origin" });
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as { items?: CartItem[] };
          serverItems = data.items ?? [];
        }
      } catch {
        if (cancelled) return;
      }

      const qtyByProduct = new Map<string, number>();
      for (const it of serverItems) {
        qtyByProduct.set(it.product.id, it.quantity);
      }
      for (const g of guestLines) {
        qtyByProduct.set(
          g.product_id,
          (qtyByProduct.get(g.product_id) ?? 0) + g.quantity
        );
      }

      const productById = new Map<string, Product>();
      for (const it of serverItems) {
        productById.set(it.product.id, it.product);
      }

      const mergedIds = [...qtyByProduct.entries()].filter(
        ([, q]) => q > 0
      ) as [string, number][];

      const missingIds = mergedIds
        .map(([id]) => id)
        .filter((id) => !productById.has(id));

      if (missingIds.length > 0) {
        try {
          const res = await fetch("/api/products");
          const all = (await res.json()) as Product[];
          if (cancelled) return;
          for (const p of all) {
            if (!productById.has(p.id)) productById.set(p.id, p);
          }
        } catch {
          /* ignore */
        }
      }

      const mergedItems: CartItem[] = [];
      for (const [pid, qty] of mergedIds) {
        const p = productById.get(pid);
        if (p && !p.unavailable_today) {
          mergedItems.push({ product: p, quantity: qty });
        }
      }

      if (cancelled) return;

      setItems(mergedItems);
      itemsRef.current = mergedItems;

      if (guestLines.length > 0) {
        localStorage.removeItem(GUEST_CART_KEY);
        try {
          await putRemoteCart(
            mergedItems.map((i) => ({
              product_id: i.product.id,
              quantity: i.quantity,
            })),
            new AbortController().signal
          );
        } catch {
          /* hydrated locally anyway */
        }
      }

      remoteHydratedRef.current = true;
      setCartReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, clearDebounce]);

  const addItem = useCallback(
    (product: Product) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.product.id === product.id);
        const next = existing
          ? prev.map((i) =>
              i.product.id === product.id
                ? { ...i, quantity: i.quantity + 1 }
                : i
            )
          : [...prev, { product, quantity: 1 }];
        itemsRef.current = next;
        queueMicrotask(() => schedulePersist());
        return next;
      });
    },
    [schedulePersist]
  );

  const removeItem = useCallback(
    (productId: string) => {
      setItems((prev) => {
        const next = prev.filter((i) => i.product.id !== productId);
        itemsRef.current = next;
        queueMicrotask(() => schedulePersist());
        return next;
      });
    },
    [schedulePersist]
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      setItems((prev) => {
        let next: CartItem[];
        if (quantity <= 0) {
          next = prev.filter((i) => i.product.id !== productId);
        } else {
          next = prev.map((i) =>
            i.product.id === productId ? { ...i, quantity } : i
          );
        }
        itemsRef.current = next;
        queueMicrotask(() => schedulePersist());
        return next;
      });
    },
    [schedulePersist]
  );

  const clearCart = useCallback(() => {
    clearDebounce();
    syncQueuedRef.current = false;
    setItems([]);
    itemsRef.current = [];
  }, [clearDebounce]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        clearRemoteCart,
        totalItems,
        totalPrice,
        cartReady,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
