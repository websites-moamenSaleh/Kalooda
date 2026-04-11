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
import type { CartLineOptionsPersisted } from "@/lib/product-options/types";
import {
  configurationKeyFromSelections,
  isSimpleConfiguration,
} from "@/lib/product-options/configuration-key";
import { normalizeCartLineOptions } from "@/lib/cart-line-options-normalize";
import { lineUnitPrice } from "@/lib/cart-line-price";
import {
  applyProductChangeToCartItems,
  broadcastPayloadToPostgresShape,
} from "@/lib/realtime-products";
import { subscribeStorefrontCatalog } from "@/lib/storefront-catalog-realtime";
import { getProductEffectivePrice } from "@/lib/product-pricing";
import { translations } from "@/lib/translations";

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => void;
  addItemWithOptions: (
    product: Product,
    lineOptions: CartLineOptionsPersisted,
    quantity?: number
  ) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  clearRemoteCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
  cartReady: boolean;
  priceUpdateNotice: string | null;
  clearPriceUpdateNotice: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}

type GuestPersistLine = {
  line_id: string;
  product_id: string;
  quantity: number;
  line_options?: unknown;
};

function readGuestCartRaw(): GuestPersistLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => {
        const product_id = String((x as { product_id?: string }).product_id ?? "");
        const quantity = Math.floor(
          Number((x as { quantity?: number }).quantity) || 0
        );
        const line_id_raw = (x as { line_id?: string }).line_id;
        const line_id =
          typeof line_id_raw === "string" && isUuid(line_id_raw)
            ? line_id_raw
            : typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `${product_id}-${Math.random().toString(36).slice(2)}`;
        return {
          line_id,
          product_id,
          quantity,
          line_options: (x as { line_options?: unknown }).line_options,
        };
      })
      .filter((x) => x.product_id && x.quantity > 0);
  } catch {
    return [];
  }
}

function writeGuestCartRaw(items: CartItem[]) {
  const raw = items.map((i) => ({
    line_id: i.lineId,
    product_id: i.product.id,
    quantity: i.quantity,
    line_options: i.line_options ?? normalizeCartLineOptions({}, i.product),
  }));
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(raw));
}

type RemoteLine = {
  line_id: string;
  product_id: string;
  quantity: number;
  line_options: unknown;
};

async function putRemoteCart(payload: RemoteLine[], signal: AbortSignal) {
  const res = await fetch("/api/cart", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    signal,
    body: JSON.stringify({ items: payload }),
  });
  if (!res.ok) throw new Error("cart_put_failed");
}

function mergeServerAndGuestLines(
  serverItems: CartItem[],
  guestLines: GuestPersistLine[],
  productById: Map<string, Product>
): CartItem[] {
  const out = serverItems.map((s) => ({ ...s }));
  for (const g of guestLines) {
    const p = productById.get(g.product_id);
    if (!p || p.unavailable_today) continue;
    const normalized = normalizeCartLineOptions(g.line_options ?? {}, p);
    const gKey = configurationKeyFromSelections(normalized.selections);
    const idx = out.findIndex(
      (s) =>
        s.product.id === g.product_id &&
        configurationKeyFromSelections(s.line_options?.selections ?? {}) === gKey
    );
    if (idx >= 0) {
      const cur = out[idx];
      out[idx] = { ...cur, quantity: cur.quantity + g.quantity };
    } else {
      out.push({
        lineId: g.line_id,
        product: p,
        quantity: g.quantity,
        line_options: normalized,
      });
    }
  }
  return out;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [priceUpdateNotice, setPriceUpdateNotice] = useState<string | null>(null);

  const itemsRef = useRef(items);
  // eslint-disable-next-line react-hooks/refs -- mirror pattern; ref read only in timeouts/async
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
        const snapshot: RemoteLine[] = itemsRef.current.map((i) => ({
          line_id: i.lineId,
          product_id: i.product.id,
          quantity: i.quantity,
          line_options: i.line_options ?? normalizeCartLineOptions({}, i.product),
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
      void (async () => {
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
              built.push({
                lineId: line.line_id,
                product: p,
                quantity: line.quantity,
                line_options: normalizeCartLineOptions(line.line_options ?? {}, p),
              });
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

    void (async () => {
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

      const productById = new Map<string, Product>();
      for (const it of serverItems) {
        productById.set(it.product.id, it.product);
      }
      try {
        const res = await fetch("/api/products");
        const all = (await res.json()) as Product[];
        if (!cancelled) {
          for (const p of all) {
            productById.set(p.id, p);
          }
        }
      } catch {
        /* ignore */
      }

      const mergedItems =
        guestLines.length > 0
          ? mergeServerAndGuestLines(serverItems, guestLines, productById)
          : serverItems;

      const finalItems: CartItem[] = [];
      for (const it of mergedItems) {
        const p = productById.get(it.product.id);
        if (p && !p.unavailable_today) {
          finalItems.push({
            ...it,
            product: p,
            line_options: normalizeCartLineOptions(it.line_options ?? {}, p),
          });
        }
      }

      if (cancelled) return;

      setItems(finalItems);
      itemsRef.current = finalItems;

      if (guestLines.length > 0) {
        localStorage.removeItem(GUEST_CART_KEY);
        try {
          await putRemoteCart(
            finalItems.map((i) => ({
              line_id: i.lineId,
              product_id: i.product.id,
              quantity: i.quantity,
              line_options: i.line_options ?? normalizeCartLineOptions({}, i.product),
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

  useEffect(() => {
    return subscribeStorefrontCatalog((event) => {
      const payload =
        event.type === "postgres"
          ? event.payload
          : broadcastPayloadToPostgresShape(event.data);
      if (!payload) return;

      setItems((prev) => {
        const next = applyProductChangeToCartItems(prev, payload);
        if (next === prev) return prev;
        itemsRef.current = next;
        queueMicrotask(() => schedulePersist());
        return next;
      });
    });
  }, [schedulePersist]);

  useEffect(() => {
    if (!cartReady || items.length === 0) return;
    let cancelled = false;
    const syncProductPrices = async () => {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) return;
        const products = (await res.json()) as Product[];
        if (cancelled || !Array.isArray(products)) return;
        const priceById = new Map(products.map((product) => [product.id, product]));
        setItems((prev) => {
          let changed = false;
          const next = prev.map((line) => {
            const latest = priceById.get(line.product.id);
            if (!latest) return line;
            const mergedProduct = { ...line.product, ...latest } as Product;
            if (!line.line_options || isSimpleConfiguration(line.line_options.selections)) {
              const oldP = getProductEffectivePrice(line.product);
              const newP = getProductEffectivePrice(latest);
              if (Math.abs(oldP - newP) >= 0.01) {
                changed = true;
              }
              return {
                ...line,
                product: mergedProduct,
                line_options: normalizeCartLineOptions(
                  line.line_options ?? {},
                  mergedProduct
                ),
              };
            }
            return { ...line, product: mergedProduct };
          });
          if (changed) {
            setPriceUpdateNotice(translations.en.priceUpdatedNotice);
          }
          itemsRef.current = next;
          return next;
        });
      } catch {
        // no-op
      }
    };

    void syncProductPrices();
    const timer = setInterval(() => {
      void syncProductPrices();
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [cartReady, items.length]);

  const addItem = useCallback(
    (product: Product) => {
      setItems((prev) => {
        const simple = (i: CartItem) =>
          !i.line_options || isSimpleConfiguration(i.line_options.selections);
        const existing = prev.find(
          (i) => i.product.id === product.id && simple(i)
        );
        const lineOptions = normalizeCartLineOptions({}, product);
        const next = existing
          ? prev.map((i) =>
              i.lineId === existing.lineId
                ? { ...i, quantity: i.quantity + 1, line_options: lineOptions }
                : i
            )
          : [
              ...prev,
              {
                lineId:
                  typeof crypto !== "undefined" && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `${product.id}-${Date.now()}`,
                product,
                quantity: 1,
                line_options: lineOptions,
              },
            ];
        itemsRef.current = next;
        queueMicrotask(() => schedulePersist());
        return next;
      });
    },
    [schedulePersist]
  );

  const addItemWithOptions = useCallback(
    (product: Product, lineOptions: CartLineOptionsPersisted, quantity = 1) => {
      const q = Math.max(1, Math.floor(quantity));
      setItems((prev) => {
        const key = configurationKeyFromSelections(lineOptions.selections);
        const existing = prev.find(
          (i) =>
            i.product.id === product.id &&
            configurationKeyFromSelections(i.line_options?.selections ?? {}) === key
        );
        const next = existing
          ? prev.map((i) =>
              i.lineId === existing.lineId
                ? { ...i, quantity: i.quantity + q, line_options: lineOptions }
                : i
            )
          : [
              ...prev,
              {
                lineId:
                  typeof crypto !== "undefined" && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `${product.id}-${Date.now()}`,
                product,
                quantity: q,
                line_options: lineOptions,
              },
            ];
        itemsRef.current = next;
        queueMicrotask(() => schedulePersist());
        return next;
      });
    },
    [schedulePersist]
  );

  const removeItem = useCallback(
    (lineId: string) => {
      setItems((prev) => {
        const next = prev.filter((i) => i.lineId !== lineId);
        itemsRef.current = next;
        queueMicrotask(() => schedulePersist());
        return next;
      });
    },
    [schedulePersist]
  );

  const updateQuantity = useCallback(
    (lineId: string, quantity: number) => {
      setItems((prev) => {
        let next: CartItem[];
        if (quantity <= 0) {
          next = prev.filter((i) => i.lineId !== lineId);
        } else {
          next = prev.map((i) =>
            i.lineId === lineId ? { ...i, quantity } : i
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
    (sum, i) => sum + lineUnitPrice(i) * i.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        addItemWithOptions,
        removeItem,
        updateQuantity,
        clearCart,
        clearRemoteCart,
        totalItems,
        totalPrice,
        cartReady,
        priceUpdateNotice,
        clearPriceUpdateNotice: () => setPriceUpdateNotice(null),
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
