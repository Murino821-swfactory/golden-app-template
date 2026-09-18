/**
 * Playground mode: the template reads URL params and adjusts rendering.
 * Used by the wizard's iframe preview.
 *
 * URL params:
 * - pattern: landing pattern id
 * - palette: color palette id
 * - sections: comma-separated section ids (order matters)
 * - locale: en | sk | ...
 */

import { config as prototypeConfig } from "./prototype-config";

export interface PlaygroundConfig {
  pattern: string;
  palette: string;
  sections: string[];
  locale: string;
  isPlayground: boolean;
}

// Defaults are DERIVED from prototype.config.json, never restated (P5). The playground
// overrides rendering at runtime via URL/postMessage; it must not carry a second opinion
// about what the build actually contains.
const DEFAULT_CONFIG: PlaygroundConfig = {
  pattern: "saas-landing",
  palette: prototypeConfig.theme.colorScheme,
  sections: prototypeConfig.patterns.landing?.sections ?? [],
  locale: prototypeConfig.defaultLocale,
  isPlayground: false,
};

export function parsePlaygroundParams(
  searchParams: URLSearchParams
): PlaygroundConfig {
  const hasAnyParam =
    searchParams.has("pattern") ||
    searchParams.has("palette") ||
    searchParams.has("sections") ||
    searchParams.has("locale");

  if (!hasAnyParam) {
    return DEFAULT_CONFIG;
  }

  const sectionsParam = searchParams.get("sections");
  const sections = sectionsParam
    ? sectionsParam.split(",").filter(Boolean)
    : DEFAULT_CONFIG.sections;

  return {
    pattern: searchParams.get("pattern") || DEFAULT_CONFIG.pattern,
    palette: searchParams.get("palette") || DEFAULT_CONFIG.palette,
    sections,
    locale: searchParams.get("locale") || DEFAULT_CONFIG.locale,
    isPlayground: true,
  };
}

/**
 * Listen for postMessage from parent (wizard) to update config.
 * Returns cleanup function.
 */
export function listenForPlaygroundUpdates(
  onUpdate: (config: Partial<PlaygroundConfig>) => void
): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type === "playground-config") {
      onUpdate(event.data.config);
    }
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}
