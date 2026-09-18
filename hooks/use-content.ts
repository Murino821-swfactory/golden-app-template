"use client";

import { useLocale } from "next-intl";
import {
  config,
  contentFor,
  entityFieldsFor,
  type EntityField,
  type LocaleContent,
} from "@/lib/prototype-config";

/**
 * The customer's copy for the language currently on screen.
 *
 * It reads `useLocale()` today, when a build ships one locale and that call returns the
 * default — deliberately, so that when locale routing lands no component has to change:
 * the same hook starts returning Slovak on `/sk` without a line edited here.
 */
export function useContent(): LocaleContent {
  return contentFor(config, useLocale());
}

/** Grid fields with their labels in the language on screen. */
export function useEntityFields(): EntityField[] {
  return entityFieldsFor(config, useLocale());
}
