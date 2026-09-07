/**
 * Playground mode: the template reads URL params and adjusts rendering.
 * Used by the wizard's iframe preview.
 *
 * URL params:
 * - pattern: landing pattern id
 * - palette: color palette id
 * - style: minimal | bold | playful
 * - sections: comma-separated section ids (order matters)
 * - locale: en | sk | ...
 */

export interface PlaygroundConfig {
  pattern: string;
  palette: string;
  style: "minimal" | "bold" | "playful";
  sections: string[];
  locale: string;
  isPlayground: boolean;
}

const DEFAULT_CONFIG: PlaygroundConfig = {
  pattern: "saas-landing",
  palette: "ocean",
  style: "minimal",
  sections: ["hero", "features", "faq", "contact", "cta"],
  locale: "en",
  isPlayground: false,
};

export function parsePlaygroundParams(
  searchParams: URLSearchParams
): PlaygroundConfig {
  const hasAnyParam =
    searchParams.has("pattern") ||
    searchParams.has("palette") ||
    searchParams.has("style") ||
    searchParams.has("sections") ||
    searchParams.has("locale");

  if (!hasAnyParam) {
    return DEFAULT_CONFIG;
  }

  const sectionsParam = searchParams.get("sections");
  const sections = sectionsParam
    ? sectionsParam.split(",").filter(Boolean)
    : DEFAULT_CONFIG.sections;

  const styleParam = searchParams.get("style");
  const style =
    styleParam === "minimal" || styleParam === "bold" || styleParam === "playful"
      ? styleParam
      : DEFAULT_CONFIG.style;

  return {
    pattern: searchParams.get("pattern") || DEFAULT_CONFIG.pattern,
    palette: searchParams.get("palette") || DEFAULT_CONFIG.palette,
    style,
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
