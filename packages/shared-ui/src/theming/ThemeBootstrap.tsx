import { BUTTON_STYLE_IDS } from "./button-styles";
import { APPEARANCES, COLOR_SCHEME_IDS, cssBlocksForBothAppearances } from "./color-schemes";
import { FONT_IDS } from "./font-families";
import { IMAGE_TRANSPARENCY_STEPS } from "./image-transparency";

/**
 * The script that applies a returning visitor's palette, appearance, font and button look
 * before the first paint, so neither the host's default palette, nor its default side (dark
 * or light), nor its default font or look flashes first.
 *
 * Render it as the FIRST child of `<body>` — the standard blocking-script slot in the App
 * Router, since a static export cannot inject into `<head>`. The host sets the defaults on
 * `<html>` itself (`data-font`; `data-scheme`, the `.dark` class and `data-appearance="light"`
 * when palettes are on; `data-button` when the looks are; `data-image-transparency` when the
 * picture's transparency is); this only overrides them for a visitor who chose differently on
 * this device.
 *
 * The appearance is applied only when palettes are on: only then does the page carry both
 * variants, and a host with one fixed look must not be turned over by a choice another app
 * stored on the same origin (the golden demo is served from tokenwise.sk). It moves the mark
 * and shadcn's `.dark` class together, exactly as the header's switch does.
 *
 * The script is a constant: its only inputs are the id lists, serialised with
 * `JSON.stringify`. No visitor input reaches it — a stored value is only compared against
 * those lists, never written into markup. It fails silently: localStorage throws outright
 * in some privacy modes, and a preference is not worth a blank page.
 */
export function themeBootstrapScript(palettes: boolean, buttons = false, imageTransparency = false): string {
  const scheme = palettes
    ? `var s=localStorage.getItem('scheme');if(${JSON.stringify(COLOR_SCHEME_IDS)}.indexOf(s)>-1){d.dataset.scheme=s}`
    : "";
  const appearance = palettes
    ? `var a=localStorage.getItem('appearance');if(${JSON.stringify(APPEARANCES)}.indexOf(a)>-1){d.dataset.appearance=a;d.classList.toggle('dark',a==='dark')}`
    : "";
  const button = buttons
    ? `var b=localStorage.getItem('button');if(${JSON.stringify(BUTTON_STYLE_IDS)}.indexOf(b)>-1){d.dataset.button=b}`
    : "";
  const image = imageTransparency
    ? `var t=localStorage.getItem('imageTransparency');if(${JSON.stringify(IMAGE_TRANSPARENCY_STEPS)}.indexOf(t)>-1){d.dataset.imageTransparency=t}`
    : "";
  return `try{var d=document.documentElement;${scheme}${appearance}var f=localStorage.getItem('font');if(${JSON.stringify(FONT_IDS)}.indexOf(f)>-1){d.dataset.font=f}${button}${image}}catch(e){}`;
}

export function ThemeBootstrap({
  palettes = false,
  buttons = false,
  imageTransparency = false,
}: {
  palettes?: boolean;
  /** The looks of the page's action (2026-11-25): bring a returning visitor's look back. Off
   * by default: a host turns it on together with the header's `button` prop, its own
   * `html[data-button]` default and the import of `@tokenwise/shared-ui/buttons.css`. */
  buttons?: boolean;
  /** The transparency of the page's picture (2026-11-25): bring a returning visitor's step
   * back. Off by default: a host turns it on together with the header's `imageTransparency`
   * prop and its own rules keyed by `html[data-image-transparency]`. */
  imageTransparency?: boolean;
}) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript(palettes, buttons, imageTransparency) }} />
      {/* Every palette as a `data-scheme` rule, dark and light, so switching the palette or
          the appearance is an attribute write (founder decision 2026-11-25: the visitor
          chooses dark or light, so both ship). Only when the host turned palettes on. */}
      {palettes && <style dangerouslySetInnerHTML={{ __html: cssBlocksForBothAppearances() }} />}
    </>
  );
}
