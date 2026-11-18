"use client";

import { useCallback, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Image as ImageIcon, Palette, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The visitor's own hands (T-460): the golden demo is where a visitor from a social network
 * lands, and it lets them change the page themselves — a picture ("Change image") and the words
 * ("Change texts"). A section that offers it renders a `TryBar` and wraps each line a visitor may
 * retype in `EditableText`. Everything stays in the browser: no request, no cost, nothing saved.
 * Only a config with `patterns.landing.tryIt` shows any of it — a customer's page never does.
 */

export type TryHint = "tryImageHint" | "tryTextsHint";

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
 * touch keys, set into the hero's product frame under its title bar — the picture, the words and
 * the colour, beside the frame's own device switch, so everything a visitor can change is in one
 * place. The colour key presses the shared header's palette button: the palette is stored and
 * cycled in one place (`@tokenwise/shared-ui`), and a second copy of that state would drift.
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
      </div>
      <p data-try-hint aria-live="polite" className="editorial-try-hint">
        {hint ? t(hint) : ""}
      </p>
    </div>
  );
}

/**
 * One line of the page a visitor may retype. While `editing` it is plain editable text
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
