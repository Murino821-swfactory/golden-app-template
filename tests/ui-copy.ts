import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "../lib/prototype-config";

// Gates run against the customer's export, whose default language need not be English.
export const uiCopy = JSON.parse(
  readFileSync(resolve(__dirname, `../messages/${config.defaultLocale}.json`), "utf8")
) as Record<string, Record<string, string>>;

export function formatLabel(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

export function labelPrefix(label: string): RegExp {
  return new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
}
