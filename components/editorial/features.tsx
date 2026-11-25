"use client";

import { useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { useContent } from "@/hooks/use-content";
import { bentoSpan, changeCardLoop, initialCardLoop, type CardLoopName } from "@/lib/editorial";
import { ICONS } from "@/lib/icons";
import { config } from "@/lib/prototype-config";
import type { Feature } from "@/lib/prototype-config";
import { cn } from "@/lib/utils";
import { LightLoop } from "./light-loop";
import { ShowcaseStrip } from "./strip";
import { EditableText, TryBar, useTextEditing } from "./try-it";
import { DISPLAY_H2, Numeral, SectionHead, Words } from "./ui";

/**
 * What the product does, as a bento: the first card wide, the rest as cards, each with its
 * numeral and Lucide icon in the palette's colour — then the showcase strip (tokenwise's
 * live products in two rows sliding past each other, `strip.tsx` — a fixed element on every
 * prototype, founder 2026-10-27) and, when the customer's copy has one, the manifesto: one paragraph in large type that lights up word by word as it
 * scrolls into the middle of the screen (`editorial.css`, `[data-word]`). Since T-340 the cards
 * arrive as one staggered group (`data-stagger`) and the manifesto is pinned while it lights up.
 *
 * T-368/T-369 (the stage): the first card carries the rendered device (`data-card-light`,
 * `stage-slab`), the manifesto's pin is a bright panel and the cards switch on like dimming
 * zones (`stage.css`).
 *
 * T-460 (the visitor's own hands, `try-it.tsx`): with `patterns.landing.tryIt` the section offers
 * the hero's two buttons under its heading — "Change image" gives every card the next loop of the
 * library (`CARD_LOOPS`), "Change texts" is the page's one editing (every text of the page
 * editable in place, the caret in this heading). Every card also carries its own "Change image"
 * key (founder, 2026-11-25: every card's picture changes like the first card's): a plain card
 * gains a picture, a card that has one takes the next (`changeCardLoop`). The key stays a key
 * while the texts are edited (`data-try-key`, `lib/text-edit.ts`). At rest the page is the one
 * every prototype shows — the device in the first card only (`initialCardLoop`) — so no visitor
 * downloads a loop they did not ask for. Browser only; no icons on the buttons, because the
 * section's `svg`s are counted.
 *
 * Contract kept from the shared features section: the configured heading is the only
 * `h2`, and the section draws exactly one `svg` per feature with an icon (the numerals, the
 * strip and the manifesto are text or pictures, on purpose).
 */

const TRANSLATION_FALLBACK: Feature[] = [
  { title: "Feature One", description: "Description of feature one" },
  { title: "Feature Two", description: "Description of feature two" },
  { title: "Feature Three", description: "Description of feature three" },
];

export function FeaturesSection() {
  const t = useTranslations("features");
  const tl = useTranslations("landing");
  const content = useContent();
  const landing = content.landing;
  const features = landing?.features ?? TRANSLATION_FALLBACK;
  const manifesto = landing?.manifesto;
  const leadWords = manifesto ? manifesto.lead.split(" ").length : 0;
  const tryIt = config.patterns.landing?.tryIt === true;
  // The pictures the visitor changed, by card; a card that is not here wears what it started with.
  const [changed, setChanged] = useState<Readonly<Record<number, CardLoopName>>>({});
  const { editing, here, toggle } = useTextEditing("features");
  const loopOf = (pictures: Readonly<Record<number, CardLoopName>>, i: number) => pictures[i] ?? initialCardLoop(i);
  const changeCard = (i: number) => setChanged((was) => ({ ...was, [i]: changeCardLoop(loopOf(was, i), i) }));
  const changeEveryCard = () => setChanged((was) => Object.fromEntries(features.map((_, i) => [i, changeCardLoop(loopOf(was, i), i)])));

  return (
    <section id="features" data-section="features" className="scroll-mt-24 relative mx-auto w-full max-w-6xl px-4 py-20 sm:py-28">
      <SectionHead>
        <EditableText as="h2" editing={editing} text={landing?.featuresHeading ?? t("title")} focus={here} className={DISPLAY_H2} />
        {tryIt && (
          <TryBar
            icons={false}
            onImage={changeEveryCard}
            editing={editing}
            onTexts={toggle}
            hint={editing ? "tryTextsHint" : null}
          />
        )}
      </SectionHead>

      <ul data-bento data-stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => {
          const Icon = feature.icon ? ICONS[feature.icon] : null;
          const span = bentoSpan(i, features.length);
          const loop = loopOf(changed, i);
          return (
            <li
              key={feature.title + i}
              data-span={span.wide ? "wide" : "one"}
              data-lit={loop ? "" : undefined}
              data-reveal
              style={{ "--i": i % 3 } as CSSProperties}
              className={cn("editorial-card relative overflow-clip rounded-3xl p-6 sm:p-8", tryIt && "editorial-card-try flex flex-col", span.className)}
            >
              {/* T-368 stage: the first card holds the product as an object — a device rendered
                  in Blender, turning under a light (`stage.css` keeps it on the card's far side).
                  On the golden demo any card can be given one (`data-lit`, the card's own key). */}
              {loop && <LightLoop key={loop} name={loop} marker="data-card-light" className="editorial-light-card" />}
              <Numeral index={i} className="absolute right-5 top-4" />
              {Icon && <Icon className="size-6 text-primary" aria-hidden />}
              <EditableText
                as="h3"
                editing={editing}
                text={feature.title}
                className={cn("mt-8 text-xl font-medium tracking-tight", span.wide && "lg:text-3xl lg:font-light")}
              />
              <EditableText
                as="p"
                editing={editing}
                text={feature.description}
                className={cn("mt-2 max-w-prose text-sm text-muted-foreground sm:text-base", span.wide && "lg:max-w-xl")}
              />
              {/* The card's own key, at its foot: the card is a column so the keys of one row
                  stand on one line whatever the length of the words above them. */}
              {tryIt && (
                <div className="mt-auto pt-6">
                  <button
                    type="button"
                    data-try="image"
                    data-try-key
                    aria-label={`${tl("tryImage")} ${String(i + 1).padStart(2, "0")}`}
                    className="editorial-try-button"
                    onClick={() => changeCard(i)}
                  >
                    {tl("tryImage")}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <ShowcaseStrip />

      {/* Apple's Display (T-340): the paragraph holds still in a taller pin while its words
          light up one after another — `editorial.css`, `--words` spreads them over the pin. */}
      {manifesto && (
        <div
          data-manifesto-pin
          className="editorial-manifesto-pin editorial-bright mt-24 sm:mt-32"
          style={{ "--words": leadWords + manifesto.body.split(" ").length } as CSSProperties}
        >
          <div data-manifesto className="editorial-manifesto mx-auto flex max-w-4xl flex-col items-center justify-center gap-6 text-center">
            <p className="text-balance text-2xl font-light leading-snug tracking-[-0.02em] sm:text-4xl">
              <strong className="font-medium text-primary">
                <Words text={manifesto.lead} from={0} />
              </strong>{" "}
              <Words text={manifesto.body} from={leadWords} />
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
