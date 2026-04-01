"use client";

import { useEffect } from "react";

/** Opens the cart drawer when `kalooda:open-cart` is dispatched (e.g. from footer). */
export function useCartDrawerEvent(setOpen: (open: boolean) => void) {
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("kalooda:open-cart", handler);
    return () => window.removeEventListener("kalooda:open-cart", handler);
  }, [setOpen]);
}
