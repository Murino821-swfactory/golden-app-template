"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useOwnerRole } from "@/hooks/use-owner-role";
import { gitpulseCopy } from "@/lib/gitpulse/copy";
import { directPublish, publishRouteFor } from "@/lib/gitpulse/social";
import { getIdToken } from "@/lib/gitpulse/token";
import type { SocialNetwork } from "@/lib/gitpulse/types";
import { CHANNELS, CHANNEL_BY_ID, FORMAT_SIZES, articleFor, captionFor, type Channel, type ChannelId, type ScenarioContent } from "@/lib/studio/channels";
import type { StudioCopy } from "@/lib/studio/copy";
import { publish, type PublishOutcome } from "@/lib/studio/publish";
import { cardTheme, renderCard, type CardSpec } from "@/lib/studio/render-card";
import { cn } from "@/lib/utils";
import type { GameClip } from "./game-scene";

interface Props {
  copy: StudioCopy;
  content: ScenarioContent | null;
  /** The game's recorded clip, when the active scene is the game and one exists. */
  clip: GameClip | null;
  pageUrl: string;
  onPublished: (channel: Channel, content: ScenarioContent, outcome: PublishOutcome, url?: string) => void;
}

interface Asset {
  blob: Blob;
  url: string;
  /** Which story and format the card shows — a stale card never goes out as a new one. */
  key: string;
}

type DirectStatus = { kind: "ok"; url: string } | { kind: "error"; text: string };

/**
 * The publish bar — five destinations, one caption, one preview, one button.
 *
 * Choosing a channel re-words the caption for its limit and re-renders the card in its
 * size, so the preview is what will be posted. The card is rendered ahead of the click:
 * the share route has to open a tab inside the click's activation, and an `await`
 * before `window.open` would get it blocked.
 *
 * Two routes behind the one button: the founder (owner role `admin`) posts to Facebook
 * and Instagram for real through the studio API (`lib/gitpulse/social.ts`); everyone
 * else, and every other channel, gets the share sheet or the profile in a new tab.
 */
export function PublishBar({ copy, content, clip, pageUrl, onPublished }: Props) {
  const c = copy.publish;
  const locale = useLocale();
  const direct = gitpulseCopy(locale).publish;
  const errors = gitpulseCopy(locale).errors;
  const { status: owner } = useOwnerRole();
  const [channelId, setChannelId] = useState<ChannelId>("site");
  const channel = CHANNEL_BY_ID[channelId];
  const route = publishRouteFor(owner?.role, channel.id);
  const auto = useMemo(() => (content ? captionFor(channel, content) : ""), [channel, content]);
  // The caption follows the data until the visitor edits it; picking a channel resets it.
  const [edited, setEdited] = useState<string | null>(null);
  const caption = edited ?? auto;
  const [asset, setAsset] = useState<Asset | null>(null);
  const assetUrl = useRef<string | null>(null);
  const [status, setStatus] = useState<PublishOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [directStatus, setDirectStatus] = useState<DirectStatus | null>(null);

  const assetKey = content ? `${content.scenario}:${channel.format}:${content.title}:${content.stats.map((s) => s.value).join(",")}` : "";

  // Pre-render the card for the channel's format whenever the story or the channel changes.
  useEffect(() => {
    if (!content) return;
    let cancelled = false;
    const spec: CardSpec = {
      eyebrow: `${copy.kicker} · ${copy.tabs[content.scenario]}`,
      title: content.title,
      stats: content.stats,
      lines: content.lines,
      footer: "tokenwise.sk",
      handle: channel.handle,
    };
    renderCard(spec, channel.format, cardTheme())
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        if (assetUrl.current) URL.revokeObjectURL(assetUrl.current);
        assetUrl.current = url;
        setAsset({ blob, url, key: assetKey });
      })
      .catch((err: unknown) => console.warn("[studio] card render failed:", err));
    return () => {
      cancelled = true;
    };
    // `assetKey` is the identity of `content` + format that matters for the card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetKey, channel, copy]);

  useEffect(
    () => () => {
      if (assetUrl.current) URL.revokeObjectURL(assetUrl.current);
    },
    []
  );

  const ready = asset !== null && asset.key === assetKey;
  const size = FORMAT_SIZES[channel.format];

  const pick = (id: ChannelId) => {
    setChannelId(id);
    setEdited(null);
    setStatus(null);
    setDirectStatus(null);
  };

  const onPublish = async () => {
    if (!content || !ready || busy) return;
    if (route === "direct") {
      setBusy(true);
      setStatus(null);
      setDirectStatus(null);
      const out = await directPublish({ network: channel.id as SocialNetwork, caption, image: asset.blob }, getIdToken);
      setBusy(false);
      if (out.ok) {
        setDirectStatus({ kind: "ok", url: out.result.url });
        onPublished(channel, content, "published", out.result.url);
      } else {
        setDirectStatus({ kind: "error", text: out.reason === "aspect" ? direct.aspect : out.reason === "meta" ? direct.metaRefused(out.message) : errors[out.error] });
        onPublished(channel, content, "failed");
      }
      return;
    }
    const outcome = await publish({
      channel,
      content,
      caption,
      image: asset.blob,
      video: clip,
      article: channel.id === "site" ? articleFor(content, c.article) : null,
      pageUrl,
    });
    setStatus(outcome);
    onPublished(channel, content, outcome);
  };

  return (
    <section aria-labelledby="publish-heading" className="rounded-xl border border-border/60 bg-card p-4 sm:p-6" data-testid="publish-bar">
      <h2 id="publish-heading" className="text-lg font-semibold">
        {c.heading}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{c.intro}</p>

      <div role="radiogroup" aria-label={c.heading} className="mt-4 flex flex-wrap gap-2">
        {CHANNELS.map((ch) => (
          <button
            key={ch.id}
            type="button"
            role="radio"
            aria-checked={ch.id === channelId}
            data-channel={ch.id}
            onClick={() => pick(ch.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
              ch.id === channelId ? "border-primary bg-primary/15 text-foreground" : "border-border/60 text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="inline-block size-2.5 rounded-full" style={{ background: ch.tint }} aria-hidden />
            {ch.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <label className="block text-sm">
          <span className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {c.caption} · {channel.handle}
            </span>
            <span className={cn("tabular-nums", caption.length > channel.captionMax && "text-destructive")}>{c.chars(caption.length, channel.captionMax)}</span>
          </span>
          <Textarea
            value={caption}
            onChange={(e) => setEdited(e.target.value)}
            rows={8}
            maxLength={channel.captionMax}
            className="min-h-40 font-mono text-xs leading-relaxed"
            aria-label={c.caption}
          />
          <span className="mt-1 block text-xs text-muted-foreground">{c.captionHint}</span>
        </label>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {c.preview} · {c.format(size.width, size.height)}
            {clip && (channel.id === "tiktok" || channel.id === "youtube") ? ` · + ${c.clip}` : ""}
          </p>
          <div className="flex items-center justify-center rounded-lg border border-border/60 bg-black/40 p-2">
            {asset ? (
              // A canvas rendering, never a remote image — next/image has nothing to optimise here.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.url} alt={content?.title ?? c.preview} className={cn("max-h-60 w-auto max-w-full rounded", !ready && "opacity-50")} data-testid="publish-preview" />
            ) : (
              <p className="py-10 text-xs text-muted-foreground">{content ? c.rendering : c.outcome.failed}</p>
            )}
          </div>
          <Button type="button" className="h-10 w-full" onClick={onPublish} disabled={!ready || busy} data-testid="publish-button" data-route={route}>
            {busy ? direct.publishing : route === "direct" ? direct.directButton(channel.label) : c.publishTo(channel.label)}
          </Button>
          {route === "direct" && (
            <p className="text-xs text-primary" data-testid="publish-direct-hint">
              {direct.direct(channel.handle)}
            </p>
          )}
          {status && (
            <p className="text-xs text-muted-foreground" role="status">
              {c.outcome[status]}
            </p>
          )}
          {directStatus && (
            <p className={cn("text-xs", directStatus.kind === "ok" ? "text-muted-foreground" : "text-destructive")} role="status" data-testid="publish-direct-status">
              {directStatus.kind === "ok" ? (
                <>
                  {direct.published}{" "}
                  <a href={directStatus.url} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">
                    {direct.view}
                  </a>
                </>
              ) : (
                directStatus.text
              )}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
