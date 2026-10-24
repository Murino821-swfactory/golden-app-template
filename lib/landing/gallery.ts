import { PROJECTS_SNAPSHOT, hostOf, type LiveProject } from "@/lib/studio/projects";

/**
 * gallery.ts — the live projects the landing shows as pictures: six production apps the
 * factory runs or their owners adopted, chosen for the range they cover (sport, the
 * factory's own site, real estate, a spa, a map tool, a collection tracker). Names,
 * descriptions and addresses come from the same snapshot the studio's projects scene uses
 * (`lib/studio/projects.ts`), so nothing here is written twice or invented.
 *
 * The pictures are 1200 × 750 WebP screenshots of the live sites taken on 2026-10-24
 * (`public/landing/<key>.webp`); like the hero video they ship with the export and carry the
 * base path themselves. Demo-branch only (`demo/gitpulse-studio`).
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const GALLERY_KEYS = ["gameday", "factory-web", "wismeo", "wellnesspodhajska", "propcheck", "collectibles"] as const;

export interface GalleryItem {
  project: LiveProject;
  /** Same-origin path of the screenshot, base path included. */
  image: string;
  /** "gameday.tokenwise.sk" — the address as people read it. */
  host: string;
}

export const GALLERY: GalleryItem[] = GALLERY_KEYS.flatMap((key) => {
  const project = PROJECTS_SNAPSHOT.find((p) => p.key === key);
  return project ? [{ project, image: `${BASE_PATH}/landing/${key}.webp`, host: hostOf(project.url) }] : [];
});
