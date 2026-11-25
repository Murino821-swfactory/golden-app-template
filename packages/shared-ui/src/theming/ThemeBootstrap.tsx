import { BUTTON_STYLE_IDS, buttonCssBlocks } from "./button-styles";
import { COLOR_SCHEME_IDS, cssBlocksForAll, type Appearance } from "./color-schemes";
import { FONT_IDS } from "./font-families";

/**
 * The script that applies a returning visitor's palette, font and button look before the first
 * paint, so none of the host's defaults flashes first.
 *
 * Render it as the FIRST child of `<body>` — the standard blocking-script slot in the App
 * Router, since a static export cannot inject into `<head>`. The host sets the defaults on
 * `<html>` itself (`data-font`, `data-scheme` when palettes are on, `data-button` when the
 * looks are); this only overrides them for a visitor who chose differently on this device.
 *
 * The script is a constant: its only inputs are the id lists, serialised with
 * `JSON.stringify`. No visitor input reaches it — a stored value is only compared against
 * those lists, never written into markup. It fails silently: localStorage throws outright
 * in some privacy modes, and a preference is not worth a blank page.
 */
export function themeBootstrapScript(palettes: boolean, buttons = false): string {
  const scheme = palettes
    ? `var s=localStorage.getItem('scheme');if(${JSON.stringify(COLOR_SCHEME_IDS)}.indexOf(s)>-1){d.dataset.scheme=s}`
    : "";
  const button = buttons
    ? `var b=localStorage.getItem('button');if(${JSON.stringify(BUTTON_STYLE_IDS)}.indexOf(b)>-1){d.dataset.button=b}`
    : "";
  return `try{var d=document.documentElement;${scheme}var f=localStorage.getItem('font');if(${JSON.stringify(FONT_IDS)}.indexOf(f)>-1){d.dataset.font=f}${button}}catch(e){}`;
}

export function ThemeBootstrap({
  palettes = false,
  buttons = false,
  appearance = "dark",
}: {
  palettes?: boolean;
  /** The looks of the page's action (2026-11-25). Off by default: a host turns them on
   * together with the header's `button` prop and its own `html[data-button]` default. */
  buttons?: boolean;
  /** The project's variant (T-400). Dark by default — the add-on ships ONE variant, so the
   * blocks are emitted in the chosen appearance; there is no visitor dark/light toggle. */
  appearance?: Appearance;
}) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript(palettes, buttons) }} />
      {/* Every palette as a `data-scheme` rule, so switching is an attribute write. Only
          when the host turned palettes on — tokenwise.sk does not in wave 1. */}
      {palettes && <style dangerouslySetInnerHTML={{ __html: cssBlocksForAll(appearance) }} />}
      {/* Every look as a `data-button` rule, for the same reason. */}
      {buttons && <style dangerouslySetInnerHTML={{ __html: buttonCssBlocks() }} />}
    </>
  );
}
