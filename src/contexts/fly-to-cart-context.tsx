"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

const POP_DURATION_MS = 160;
const SHRINK_DURATION_MS = 220;
const FLY_DURATION_MS = 560;
const CART_PULSE_CLASS = "fly-cart-target-pulse";
type FlyToCartInput = {
  sourceEl: HTMLElement | null;
};

type FlyToCartContextValue = {
  flyToCart: (input: FlyToCartInput) => void;
};

const FlyToCartContext = createContext<FlyToCartContextValue | null>(null);

function getCartTargetElement(): HTMLElement | null {
  const targets = Array.from(
    document.querySelectorAll<HTMLElement>("[data-cart-target='true']")
  );
  if (targets.length === 0) return null;

  // Prefer a visible target when desktop/mobile variants coexist.
  const visible = targets.find((node) => {
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  return visible ?? targets[0] ?? null;
}

function pulseCartTarget(target: HTMLElement | null) {
  if (!target) return;
  target.classList.remove(CART_PULSE_CLASS);
  void target.offsetWidth;
  target.classList.add(CART_PULSE_CLASS);
  window.setTimeout(() => {
    target.classList.remove(CART_PULSE_CLASS);
  }, 420);
}

export function FlyToCartProvider({ children }: { children: ReactNode }) {
  const reducedMotionRef = useRef(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reducedMotionRef.current = media.matches;
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const flyToCart = useCallback(({ sourceEl }: FlyToCartInput) => {
    if (!sourceEl || typeof window === "undefined") return;
    const overlayEl = overlayRef.current;
    if (!overlayEl) return;
    const targetEl = getCartTargetElement();
    if (!targetEl) return;

    if (reducedMotionRef.current) {
      pulseCartTarget(targetEl);
      return;
    }

    const sourceRect = sourceEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    if (
      sourceRect.width === 0 ||
      sourceRect.height === 0 ||
      targetRect.width === 0 ||
      targetRect.height === 0
    ) {
      pulseCartTarget(targetEl);
      return;
    }

    const ghost = sourceEl.cloneNode(true) as HTMLElement;
    ghost.classList.add("fly-ghost-base");
    ghost.style.pointerEvents = "none";
    ghost.style.position = "fixed";
    ghost.style.left = `${sourceRect.left}px`;
    ghost.style.top = `${sourceRect.top}px`;
    ghost.style.width = `${sourceRect.width}px`;
    ghost.style.height = `${sourceRect.height}px`;
    ghost.style.margin = "0";
    ghost.style.transformOrigin = "center center";
    ghost.style.willChange = "transform, opacity, filter";
    ghost.setAttribute("aria-hidden", "true");
    overlayEl.appendChild(ghost);

    const centerSourceX = sourceRect.left + sourceRect.width / 2;
    const centerSourceY = sourceRect.top + sourceRect.height / 2;
    const centerTargetX = targetRect.left + targetRect.width / 2;
    const centerTargetY = targetRect.top + targetRect.height / 2;

    const deltaX = centerTargetX - centerSourceX;
    const deltaY = centerTargetY - centerSourceY;

    const popTimer = window.setTimeout(() => {
      ghost.style.transition = `transform ${POP_DURATION_MS}ms cubic-bezier(0.2, 0.9, 0.2, 1)`;
      ghost.style.transform = "translate3d(0px, 0px, 0) scale(1.08)";
    }, 10);

    const shrinkTimer = window.setTimeout(() => {
      ghost.classList.add("fly-ghost-shrink");
      ghost.style.transition = `transform ${SHRINK_DURATION_MS}ms cubic-bezier(0.3, 0.1, 0.2, 1), opacity ${SHRINK_DURATION_MS}ms ease-out, filter ${SHRINK_DURATION_MS}ms ease-out`;
      ghost.style.transform = "translate3d(0px, 0px, 0) scale(0.14)";
    }, POP_DURATION_MS + 80);

    const flyTimer = window.setTimeout(() => {
      ghost.style.transition = `transform ${FLY_DURATION_MS}ms cubic-bezier(0.16, 0.84, 0.28, 1), opacity ${FLY_DURATION_MS}ms ease-out, filter ${FLY_DURATION_MS}ms ease-out`;
      ghost.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.1)`;
    }, POP_DURATION_MS + 80 + SHRINK_DURATION_MS + 48);

    const totalMs = POP_DURATION_MS + 80 + SHRINK_DURATION_MS + 48 + FLY_DURATION_MS + 140;
    const doneTimer = window.setTimeout(() => {
      pulseCartTarget(targetEl);
      ghost.remove();
    }, totalMs);

    window.setTimeout(() => {
      window.clearTimeout(popTimer);
      window.clearTimeout(shrinkTimer);
      window.clearTimeout(flyTimer);
      window.clearTimeout(doneTimer);
      ghost.remove();
    }, totalMs + 16);
  }, []);

  const value = useMemo(() => ({ flyToCart }), [flyToCart]);

  return (
    <FlyToCartContext.Provider value={value}>
      {children}
      <div
        ref={overlayRef}
        className="pointer-events-none fixed inset-0 z-[130] overflow-visible"
        aria-hidden="true"
      />
    </FlyToCartContext.Provider>
  );
}

export function useFlyToCart() {
  const ctx = useContext(FlyToCartContext);
  if (!ctx) {
    throw new Error("useFlyToCart must be used within FlyToCartProvider");
  }
  return ctx;
}
