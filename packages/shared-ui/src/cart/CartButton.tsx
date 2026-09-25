"use client";

import { useCallback, useRef, useState } from "react";
import { format, type HeaderLabels } from "../header/labels";
import { useDismiss } from "../header/use-dismiss";

export interface CartProps {
  count: number;
  /** When set, the host owns the cart (later: Stripe). Absent, a click shows "empty". */
  onOpen?: () => void;
}

/**
 * The cart, always visible, between language and user. Wave 1 has nothing to sell, so it
 * is a placeholder that answers honestly: a click says the cart is empty.
 */
export function CartButton({
  cart,
  labels,
}: {
  cart: CartProps;
  labels: Pick<HeaderLabels, "cartLabel" | "cartEmpty">;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, ref, close);

  return (
    <div ref={ref} className="relative" data-shared-control="cart">
      <button
        type="button"
        onClick={() => (cart.onOpen ? cart.onOpen() : setOpen(!open))}
        aria-label={format(labels.cartLabel, { count: cart.count })}
        aria-expanded={cart.onOpen ? undefined : open}
        className="relative flex h-11 w-11 items-center justify-center rounded-md text-[var(--shared-ink-muted)] transition-colors hover:text-[var(--shared-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--shared-accent)]"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          focusable="false"
        >
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
        {cart.count > 0 && (
          <span
            aria-hidden
            className="absolute right-1 top-1 min-w-4 rounded-full bg-[var(--shared-accent)] px-1 text-center text-[10px] font-bold leading-4 text-[var(--shared-bg)]"
          >
            {cart.count}
          </span>
        )}
      </button>
      {open && (
        <div
          role="status"
          className="absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-lg border border-[var(--shared-rule)] bg-[var(--shared-bg)] px-4 py-3 text-sm text-[var(--shared-ink)] shadow-lg"
        >
          {labels.cartEmpty}
        </div>
      )}
    </div>
  );
}
