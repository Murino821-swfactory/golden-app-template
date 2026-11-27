"use client";

import { useEffect } from "react";
import {
  CUSTOMER_TEXTS_TIMEOUT_MS,
  customerTexts,
  previewApiUrl,
  previewTokenFrom,
} from "@/lib/customer-texts";

/**
 * Opens a preview link on the golden demo (founder, 2026-11-27): asks the site's API for the
 * words the model wrote for a customer and shows them in the demo's own structure.
 *
 * `html[data-customer-texts]` says where it is: `loading` (set before the first paint by the
 * shell's bootstrap, so the demo's own words never flash first — `app/globals.css` keeps the
 * page unseen), `ready`, or `failed` — a failed request, a timeout or words that may not be
 * shown leave the demo as it is. Mounted by the shell for a `tryIt` build only; renders nothing.
 */
export function CustomerTexts() {
  useEffect(() => {
    const token = previewTokenFrom(window.location.search);
    if (!token) return;
    const root = document.documentElement;
    root.setAttribute("data-customer-texts", "loading");
    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), CUSTOMER_TEXTS_TIMEOUT_MS);
    const settle = (state: "ready" | "failed") => {
      if (active) root.setAttribute("data-customer-texts", state);
    };

    fetch(previewApiUrl(token), {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((words: unknown) => settle(customerTexts.show(words).ok ? "ready" : "failed"))
      .catch(() => settle("failed"))
      .finally(() => window.clearTimeout(timer));

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return null;
}
