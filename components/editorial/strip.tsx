import { STRIP_MIN, stripRows, type ConceptTile } from "@/lib/editorial";

/**
 * The concept strip (PR D, 2026-10-26, after the "Initial concepts" of mdx.so's case
 * studies): two rows of cards sliding in opposite directions in an endless loop, paused on
 * hover, still under reduced motion. The cards are the product itself — its screens when
 * the pipeline published them, else its offers, records, numbers, features and questions
 * (`conceptTilesFor`). Every row holds its tiles twice, so a translate of exactly half the
 * row is one seamless loop (`editorial.css`). Decoration: the words are already on the page
 * elsewhere, so the whole strip is hidden from assistive technology, carries no link and no
 * `svg` (the features section counts one per icon).
 */
export function ConceptStrip({ tiles }: { tiles: ConceptTile[] }) {
  if (tiles.length < STRIP_MIN) return null;
  const rows = stripRows(tiles);
  return (
    <div data-strip aria-hidden="true" className="editorial-strip">
      {rows.map((row, r) => (
        <div key={r} data-strip-row={r === 0 ? "a" : "b"} className="editorial-strip-row">
          {[...row, ...row].map((tile, i) => (
            <Tile key={i} tile={tile} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Tile({ tile }: { tile: ConceptTile }) {
  if (tile.kind === "image") {
    return (
      <figure data-strip-tile className="editorial-strip-tile editorial-strip-picture">
        {/* next/image cannot optimise in a static export; the pictures are published beside it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={tile.src} alt="" loading="lazy" decoding="async" />
      </figure>
    );
  }
  return (
    <div data-strip-tile className="editorial-strip-tile editorial-card editorial-strip-card">
      {tile.eyebrow && <span className="editorial-strip-eyebrow">{tile.eyebrow}</span>}
      <p className="editorial-strip-title">{tile.title}</p>
      {tile.value && <p className="editorial-strip-value">{tile.value}</p>}
    </div>
  );
}
