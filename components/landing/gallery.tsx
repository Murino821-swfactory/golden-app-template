"use client";

import type { CSSProperties } from "react";
import { useLocale } from "next-intl";
import { landingCopy } from "@/lib/landing/copy";
import { GALLERY } from "@/lib/landing/gallery";
import { PROJECTS_SNAPSHOT, projectsSummary } from "@/lib/studio/projects";

/**
 * The live projects as pictures — the proof the Indoobit page gives with its concept
 * gallery, here with real production apps. On a desktop that moves and supports
 * scroll-driven animation the block pins for two screens and the strip slides sideways as
 * the page scrolls (`app/landing.css`, `.landing-gallery*`); on a phone, with reduced
 * motion or without support it is a horizontal swipe strip with snap points. Every card is
 * a link to the app itself. Rendered inside the features section, so it carries an `h3` (the
 * section's one `h2` is the features heading) and draws no `svg` (one per feature icon).
 */
export function ProjectGallery() {
  const locale = useLocale();
  const words = landingCopy(locale);
  const total = projectsSummary(PROJECTS_SNAPSHOT).count;

  return (
    <div data-gallery className="landing-gallery">
      <div className="landing-gallery-pin">
        <div className="landing-gallery-head">
          <span data-kicker className="landing-eyebrow">
            {words.gallery.kicker}
          </span>
          <h3 className="max-w-3xl text-balance text-2xl font-light tracking-[-0.02em] sm:text-4xl">{words.gallery.title(GALLERY.length, total)}</h3>
        </div>
        <ul className="landing-gallery-track">
          {GALLERY.map(({ project, image, host }, i) => (
            <li key={project.key} data-gallery-card className="landing-gallery-card" style={{ "--i": i } as CSSProperties}>
              <a href={project.url ?? undefined} target="_blank" rel="noreferrer">
                {/* next/image cannot optimise in a static export; a plain img with real size. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt={`${project.name} — ${project.description ?? host}`} width={1200} height={750} loading="lazy" decoding="async" />
                <span className="landing-gallery-caption">
                  <span className="text-base font-medium">{project.name}</span>
                  <span className="text-xs text-muted-foreground">{host}</span>
                </span>
                <span className="line-clamp-2 text-sm text-muted-foreground">{project.description}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
