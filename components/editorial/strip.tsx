"use client";

import { useTranslations } from "next-intl";
import { getProductSlug } from "@/lib/demo-slug";
import { stripRows } from "@/lib/editorial";
import { showcaseFor, showcaseHref, showcaseImage, type ShowcaseItem } from "@/lib/showcase";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * The showcase strip (founder, 2026-10-27; after the tokenwise.sk landing's `WorkStrip`,
 * which itself followed this file's concept strip of 2026-10-26): two rows of tokenwise's
 * live products sliding in opposite directions in an endless loop, paused on hover or
 * focus, still under reduced motion. Every row holds its tiles twice, so a translate of
 * exactly half the row is one seamless loop (`editorial.css`). The tiles are links — the
 * strip's promise is "open any of them" — and the first copy of a row is the accessible
 * one; the second is the loop's filler, hidden from assistive technology and out of the
 * tab order. No `svg`: the features section counts one per icon.
 */
export function ShowcaseStrip() {
  const t = useTranslations("showcase");
  const slug = getProductSlug();
  const rows = stripRows(showcaseFor(slug));
  return (
    <div data-strip role="group" aria-label={t("label")} className="editorial-strip">
      {rows.map((row, r) => (
        <div key={r} data-strip-row={r === 0 ? "a" : "b"} className="editorial-strip-row">
          {row.map((item) => (
            <Tile key={item.key} item={item} kind={t(`kinds.${item.key}`)} slug={slug} />
          ))}
          <div data-strip-echo aria-hidden="true" className="contents">
            {row.map((item) => (
              <Tile key={item.key} item={item} kind={t(`kinds.${item.key}`)} slug={slug} echo />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Tile({ item, kind, slug, echo = false }: { item: ShowcaseItem; kind: string; slug: string | null; echo?: boolean }) {
  return (
    <a
      href={showcaseHref(item, slug)}
      target="_blank"
      rel="noopener noreferrer"
      data-strip-tile
      data-showcase={echo ? undefined : item.key}
      tabIndex={echo ? -1 : undefined}
      className="editorial-strip-tile editorial-strip-link"
    >
      {/* next/image cannot optimise in a static export; the pictures ship beside it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={showcaseImage(BASE_PATH, item)} width={640} height={400} alt="" loading="lazy" decoding="async" />
      <span className="editorial-strip-caption">
        <span className="editorial-strip-eyebrow">{kind}</span>
        <span className="editorial-strip-title">
          {item.name}
          <span aria-hidden="true"> ↗</span>
        </span>
      </span>
    </a>
  );
}
