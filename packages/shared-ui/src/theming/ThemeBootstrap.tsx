import { COLOR_SCHEME_IDS, cssBlocksForAll } from "./color-schemes";
import { FONT_IDS } from "./font-families";

/**
 * The script that applies a returning visitor's palette and font before the first paint, so
 * neither the host's default palette nor its default font flashes first.
 *
 * Render it as the FIRST child of `<body>` — the standard blocking-script slot in the App
 * Router, since a static export cannot inject into `<head>`. The host sets the defaults on
 * `<html>` itself (`data-font`, and `data-scheme` when palettes are on); this only
 * overrides them for a visitor who chose differently on this device.
 *
 * The script is a constant: its only inputs are the two id lists, serialised with
 * `JSON.stringify`. No visitor input reaches it — a stored value is only compared against
 * those lists, never written into markup. It fails silently: localStorage throws outright
 * in some privacy modes, and a preference is not worth a blank page.
 */
export function themeBootstrapScript(palettes: boolean): string {
  const scheme = palettes
    ? `var s=localStorage.getItem('scheme');if(${JSON.stringify(COLOR_SCHEME_IDS)}.indexOf(s)>-1){d.dataset.scheme=s}`
    : "";
  return `try{var d=document.documentElement;${scheme}var f=localStorage.getItem('font');if(${JSON.stringify(FONT_IDS)}.indexOf(f)>-1){d.dataset.font=f}}catch(e){}`;
}

export function ThemeBootstrap({ palettes = false }: { palettes?: boolean }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript(palettes) }} />
      {/* Every palette as a `data-scheme` rule, so switching is an attribute write. Only
          when the host turned palettes on — tokenwise.sk does not in wave 1. */}
      {palettes && <style dangerouslySetInnerHTML={{ __html: cssBlocksForAll() }} />}
    </>
  );
}
