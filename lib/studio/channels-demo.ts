import { CHANNELS, FORMAT_SIZES, captionFor, type ChannelId } from "./channels";
import { studioCopy } from "./copy";
import { PROJECTS_SNAPSHOT } from "./projects";
import { projectsContent } from "./scenarios";

/**
 * The landing's channels demo (T-384, from the T-344 v3 redesign): the live-projects story exactly as the studio
 * words and sizes it for each network — `projectsContent` over the projects snapshot, `captionFor` per channel and
 * the channel's image format. Pure; pinned by tests/channels-demo.spec.ts.
 */
export interface ChannelPreview {
  id: ChannelId;
  label: string;
  width: number;
  height: number;
  title: string;
  summary: string;
  stats: { label: string; value: string }[];
  caption: string;
  captionMax: number;
}

export function channelPreviews(locale: string): ChannelPreview[] {
  const content = projectsContent(PROJECTS_SNAPSHOT, studioCopy(locale));
  return CHANNELS.map((channel) => ({
    id: channel.id,
    label: channel.label,
    ...FORMAT_SIZES[channel.format],
    title: content.title,
    summary: content.summary,
    stats: content.stats,
    caption: captionFor(channel, content),
    captionMax: channel.captionMax,
  }));
}

/** The demo's own words; everything in the card and the caption is the studio's. */
export const CHANNELS_DEMO_COPY = {
  en: { kicker: "Demo", hint: "This week's live-projects story, sized and worded for each network.", chars: (n: number, max: number) => `${n} / ${max} characters` },
  cs: { kicker: "Ukázka", hint: "Příběh živých projektů tohoto týdne, v rozměru a textu pro každou síť.", chars: (n: number, max: number) => `${n} / ${max} znaků` },
} as const;
