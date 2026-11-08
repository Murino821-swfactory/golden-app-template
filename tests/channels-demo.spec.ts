import { test, expect } from "@playwright/test";
import { CHANNELS, FORMAT_SIZES, captionFor } from "../lib/studio/channels";
import { PROJECTS_SNAPSHOT } from "../lib/studio/projects";
import { projectsContent } from "../lib/studio/scenarios";
import { studioCopy } from "../lib/studio/copy";
import { channelPreviews } from "../lib/studio/channels-demo";

/**
 * The landing's channels demo (T-384, from the T-344 v3 redesign): this week's live-projects story as the studio
 * words and sizes it for each of the five networks. Built from the studio's own functions; pure, no browser.
 */
test.describe("landing channels demo (pure)", () => {
  for (const locale of ["en", "cs"] as const) {
    test(`${locale}: five networks, each in its own image size, the caption the studio writes, inside its limit`, () => {
      const content = projectsContent(PROJECTS_SNAPSHOT, studioCopy(locale));
      const previews = channelPreviews(locale);
      expect(previews.map((p) => p.id)).toEqual(CHANNELS.map((c) => c.id));
      for (const [i, p] of previews.entries()) {
        const channel = CHANNELS[i]!;
        expect({ width: p.width, height: p.height }).toEqual(FORMAT_SIZES[channel.format]);
        expect(p.caption).toBe(captionFor(channel, content));
        expect(p.caption.length).toBeLessThanOrEqual(channel.captionMax);
        expect(p.title).toBe(content.title);
      }
    });
  }
});
