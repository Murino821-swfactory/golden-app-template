"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type FocusEvent, type KeyboardEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Image as ImageIcon, MousePointerClick, Palette, PenLine } from "lucide-react";
import { editTexts, textEdit } from "@/lib/text-edit";
import { cn } from "@/lib/utils";

/**
 * The visitor's own hands (T-460): the golden demo is where a visitor from a social network
 * lands, and it lets them change the page themselves — a picture ("Change image") and the words
 * ("Change texts"). A section that offers it renders a `TryBar`. Everything stays in the browser:
 * no request, no cost, nothing saved. Only a config with `patterns.landing.tryIt` shows any of it
 * — a customer's page never does.
 *
 * "Change texts" is ONE editing for the whole page (founder, 2026-11-24): whichever button starts
 * it, every text the page shows can be retyped (`lib/text-edit.ts` finds the lines in the DOM, so
 * no section opts in), and `TextEditing` brings a dock with "Done" wherever the visitor has
 * scrolled away from the keys. A line whose typography is drawn from its words (the headline's
 * phrase in weight, a two-tone lead) is an `EditableText`, so it is drawn again from what the
 * visitor wrote.
 */

/** The page's one text editing, for a section's button: whether it is on, whether this section's
 * button started it (its first line takes the caret), and the switch. */
export function useTextEditing(section: string) {
  const state = useSyncExternalStore(textEdit.subscribe, textEdit.get, textEdit.off);
  return { editing: state.editing, here: state.editing && state.origin === section, toggle: () => textEdit.toggle(section) };
}

/**
 * Mounted once by the landing page of a config with `tryIt`: while the editing is on it opens
 * every text of the document for typing and brings the dock. Leaving the page ends the editing.
 */
export function TextEditing() {
  const { editing } = useSyncExternalStore(textEdit.subscribe, textEdit.get, textEdit.off);
  useEffect(() => (editing ? editTexts(document.body) : undefined), [editing]);
  useEffect(() => textEdit.stop, []);
  return editing ? <TextDock /> : null;
}

/**
 * The dock: one line saying what to do and "Done", fixed to the foot of the window — the keys
 * that started the editing are a long scroll away by the time the visitor retypes the footer. It
 * stands only while no "Change texts" key is on screen: beside one it would say the same twice,
 * and in the hero it would lie over the control pad.
 */
function TextDock() {
  const t = useTranslations("landing");
  const [away, setAway] = useState(false);
  useEffect(() => {
    const seen = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) seen.add(entry.target);
        else seen.delete(entry.target);
      }
      setAway(seen.size === 0);
    });
    for (const key of document.querySelectorAll("[data-try-bar] [data-try='texts']")) observer.observe(key);
    return () => observer.disconnect();
  }, []);
  if (!away) return null;
  return (
    <div data-try-dock role="group" aria-label={t("tryLabel")} className="editorial-dock">
      <PenLine aria-hidden className="size-4 shrink-0" />
      <p>{t("tryTextsDock")}</p>
      <button type="button" className="editorial-dock-done" onClick={textEdit.stop}>
        {t("tryTextsDone")}
      </button>
    </div>
  );
}

export type TryHint = "tryImageHint" | "tryStillHint" | "tryTextsHint";

/**
 * The two buttons and, under them, one line saying what the real function does on the visitor's
 * own page. Buttons, not links: a section keeps the links its contract counts. `icons` is off
 * where a section counts its `svg`s (features: one per configured icon).
 */
export function TryBar({
  onImage,
  editing,
  onTexts,
  hint,
  icons = true,
  className,
}: {
  /** Absent: this section has no picture to change, so it offers the words only. */
  onImage?: () => void;
  editing: boolean;
  onTexts: () => void;
  hint: TryHint | null;
  icons?: boolean;
  className?: string;
}) {
  const t = useTranslations("landing");
  return (
    <div data-try-bar className={cn("editorial-try", className)}>
      <div role="group" aria-label={t("tryLabel")} className="flex flex-wrap items-center justify-center gap-2">
        {onImage && (
          <button type="button" data-try="image" className="editorial-try-button" onClick={onImage}>
            {icons && <ImageIcon aria-hidden className="size-4" />}
            {t("tryImage")}
          </button>
        )}
        <button type="button" data-try="texts" aria-pressed={editing} className="editorial-try-button" onClick={onTexts}>
          {icons && <PenLine aria-hidden className="size-4" />}
          {editing ? t("tryTextsDone") : t("tryTexts")}
        </button>
      </div>
      <p data-try-hint aria-live="polite" className="editorial-try-hint">
        {hint ? t(hint) : ""}
      </p>
    </div>
  );
}

/**
 * The control pad (founder, 2026-11-18: "the page's control panel"): the same controls as large
 * touch keys, set into the hero's product frame under its title bar — the picture, the words,
 * the colour and the look of the page's action (2026-11-25), beside the frame's own device
 * switch, so everything a visitor can change is in one place. The colour key and the button key
 * press the shared header's own controls: the palette and the look are stored and cycled in one
 * place (`@tokenwise/shared-ui`), and a second copy of that state would drift. The header keeps
 * its button control in the document at every width, so the key works on a phone too.
 */
export function TryPad({
  onImage,
  editing,
  onTexts,
  hint,
}: {
  onImage?: () => void;
  editing: boolean;
  onTexts: () => void;
  hint: TryHint | null;
}) {
  const t = useTranslations("landing");
  const tc = useTranslations("common");
  return (
    <div data-try-bar data-try-pad className="editorial-pad">
      <div role="group" aria-label={t("tryLabel")} className="editorial-pad-keys">
        {onImage && (
          <button type="button" data-try="image" className="editorial-pad-key" onClick={onImage}>
            <ImageIcon aria-hidden className="size-5" />
            <span>{t("tryImage")}</span>
          </button>
        )}
        <button type="button" data-try="texts" aria-pressed={editing} className="editorial-pad-key" onClick={onTexts}>
          <PenLine aria-hidden className="size-5" />
          <span>{editing ? t("tryTextsDone") : t("tryTexts")}</span>
        </button>
        <button
          type="button"
          data-try="colour"
          className="editorial-pad-key"
          onClick={() => document.querySelector<HTMLButtonElement>('[data-shared-control="palette"]')?.click()}
        >
          <Palette aria-hidden className="size-5" />
          <span>{tc("changeColour")}</span>
        </button>
        <button
          type="button"
          data-try="button"
          className="editorial-pad-key"
          onClick={() => document.querySelector<HTMLButtonElement>('[data-shared-control="button"]')?.click()}
        >
          <MousePointerClick aria-hidden className="size-5" />
          <span>{tc("changeButton")}</span>
        </button>
      </div>
      <p data-try-hint aria-live="polite" className="editorial-try-hint">
        {hint ? t(hint) : ""}
      </p>
    </div>
  );
}

/**
 * A line whose view is drawn from its words. While `editing` it is plain editable text
 * (`contenteditable="plaintext-only"`, one line: Enter ends the editing of that line); otherwise it
 * is drawn by `view` — the section's own typography — from the visitor's words once they wrote
 * some. The two states are two elements (different keys), so React never reconciles the drawn
 * spans into nodes the visitor's typing replaced; what was typed is kept when the caret leaves
 * the line, and an emptied line falls back to the configured text.
 */
export function EditableText({
  as,
  editing,
  text,
  view,
  focus = false,
  className,
}: {
  as: "h1" | "h2" | "h3" | "p";
  editing: boolean;
  text: string;
  view?: (text: string) => ReactNode;
  /** Take the caret when the editing opens (the section's first line). */
  focus?: boolean;
  className?: string;
}) {
  const Tag = as;
  const [own, setOwn] = useState<string | null>(null);
  const value = own ?? text;
  // A stable callback ref: it runs when the editable line mounts, not on every render — a line
  // that took the caret back after each blur could never be left.
  const takeCaret = useCallback(
    (element: HTMLElement | null) => {
      if (element && focus) element.focus();
    },
    [focus]
  );

  if (!editing) return <Tag key="view" className={className}>{view ? view(value) : value}</Tag>;

  return (
    <Tag
      key="edit"
      ref={takeCaret}
      className={cn(className, "editorial-editable")}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      onBlur={(event: FocusEvent<HTMLElement>) => setOwn(event.currentTarget.textContent?.trim() || null)}
    >
      {value}
    </Tag>
  );
}
