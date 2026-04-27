"use client";

import { useRef, type ReactNode } from "react";

interface ModalBackdropProps {
  onClose: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  role?: string;
  "aria-modal"?: boolean;
  "aria-labelledby"?: string;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * Backdrop wrapper that only closes the modal when the user clicks directly
 * on the backdrop — not when a drag starts inside the modal and ends outside.
 */
export function ModalBackdrop({
  onClose,
  disabled = false,
  className = "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4",
  children,
  ...rest
}: ModalBackdropProps) {
  const mouseDownOnBackdrop = useRef(false);

  return (
    <div
      className={className}
      onMouseDown={(e) => {
        mouseDownOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={() => {
        if (mouseDownOnBackdrop.current && !disabled) onClose();
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
