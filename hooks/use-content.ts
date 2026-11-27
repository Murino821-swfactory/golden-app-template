"use client";

import { useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import { customerTexts } from "@/lib/customer-texts";
import {
  config,
  contentFor,
  entityFieldsFor,
  type EntityField,
  type LocaleContent,
  type PrototypeConfig,
} from "@/lib/prototype-config";

const builtConfig = () => config;
const shownConfig = () => customerTexts.get() ?? config;

/**
 * The config the page shows: the build's own — or, on the golden demo opened from a preview
 * link, the build's with a customer's name and words in it (`lib/customer-texts.ts`, founder
 * 2026-11-27). The static HTML is always the build's; the customer's words replace it in the
 * browser once they have arrived and passed the rules.
 */
export function useShownConfig(): PrototypeConfig {
  return useSyncExternalStore(customerTexts.subscribe, shownConfig, builtConfig);
}

/**
 * The customer's copy for the language currently on screen.
 *
 * It reads `useLocale()` today, when a build ships one locale and that call returns the
 * default — deliberately, so that when locale routing lands no component has to change:
 * the same hook starts returning Slovak on `/sk` without a line edited here.
 */
export function useContent(): LocaleContent {
  return contentFor(useShownConfig(), useLocale());
}

/** Grid fields with their labels in the language on screen. */
export function useEntityFields(): EntityField[] {
  return entityFieldsFor(useShownConfig(), useLocale());
}

/** The app's name as the page shows it — the customer's on a golden-demo preview. */
export function useAppName(): string {
  return useShownConfig().appName;
}
