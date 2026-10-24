"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { useOwnerRole } from "@/hooks/use-owner-role";
import type { GitpulseCopy } from "@/lib/gitpulse/copy";
import { composeShareText, sharePlan } from "@/lib/gitpulse/share";
import { directPublish, publishRouteFor } from "@/lib/gitpulse/social";
import { getIdToken } from "@/lib/gitpulse/token";
import type { SocialNetwork, TextKind } from "@/lib/gitpulse/types";
import { localeHref } from "@/lib/locale-routing";
import { CHANNEL_BY_ID } from "@/lib/studio/channels";
import type { ImageResult } from "./image-panel";
import { StepCard } from "./ui";

/**
 * The publish queue — where "buttons that represent publishing" become buttons that
 * publish. X, LinkedIn and Facebook open the visitor's own prefilled composer; the
 * clipboard platforms copy the caption and open the platform, and the note says so.
 * No social credential ever touches the demo.
 *
 * The founder (owner role `admin`) gets one more button on Facebook and Instagram pieces:
 * a real post on @tokenwisefactory through the studio API, with the step-3 visual as the
 * image (`lib/gitpulse/social.ts`).
 */

export type QueueStatus = "draft" | "review" | "published";

export interface QueueItem {
  id: string;
  kind: TextKind;
  title: string;
  body: string;
  hashtags: string[];
  status: QueueStatus;
  /** The live post, once it went out through the direct route. */
  url?: string;
}

export function PublishPanel({ items, onChange, copy, image }: {
  items: QueueItem[];
  onChange: (items: QueueItem[]) => void;
  copy: GitpulseCopy;
  /** The step-3 visual, when one was generated — the direct route needs it. */
  image: ImageResult | null;
}) {
  const locale = useLocale();
  const { status: owner } = useOwnerRole();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const c = copy.publish;

  function update(id: string, patch: Partial<QueueItem>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function publish(item: QueueItem) {
    const text = composeShareText(item);
    // The shared link is the prototype's landing in this language, resolved at click time.
    const pageUrl = `${window.location.origin}${localeHref(locale, "/")}`;
    const plan = sharePlan(item.kind, text, pageUrl);
    if (plan.mode === "copy-open") {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        /* clipboard denied — the composer still opens */
      }
    }
    window.open(plan.url, "_blank", "noopener");
    if (item.status === "draft") update(item.id, { status: "review" });
  }

  async function post(item: QueueItem) {
    if (busyId) return;
    if (!image) {
      setNotes((n) => ({ ...n, [item.id]: c.needImage }));
      return;
    }
    setBusyId(item.id);
    setNotes((n) => ({ ...n, [item.id]: "" }));
    const out = await directPublish({ network: item.kind as SocialNetwork, caption: composeShareText(item), image: image.dataUri }, getIdToken);
    setBusyId(null);
    if (out.ok) {
      update(item.id, { status: "published", url: out.result.url });
      return;
    }
    const text = out.reason === "aspect" ? c.aspect : out.reason === "meta" ? c.metaRefused(out.message) : copy.errors[out.error];
    setNotes((n) => ({ ...n, [item.id]: text }));
  }

  return (
    <StepCard title={c.title} description={c.intentNote}>
      {items.length === 0 && <p className="text-sm text-muted-foreground">{c.empty}</p>}
      <ul className="space-y-3">
        {items.map((item) => {
          // Only the mode is needed for labels; the real URL is resolved on click.
          const plan = sharePlan(item.kind, "", "");
          const route = publishRouteFor(owner?.role, item.kind);
          const handle = route === "direct" ? CHANNEL_BY_ID[item.kind as SocialNetwork].handle : "";
          return (
            <li key={item.id} className="rounded-lg border border-border p-3" data-testid="gitpulse-queue-item">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{copy.text.kinds[item.kind]}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${
                  item.status === "published" ? "bg-primary/15 text-primary" : "border border-border text-muted-foreground"
                }`}>
                  {c.statuses[item.status === "review" ? "review" : item.status]}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.title || item.body}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {route === "direct" && !item.url && (
                  <Button size="sm" onClick={() => void post(item)} disabled={busyId !== null} data-testid="gitpulse-direct-post">
                    {busyId === item.id ? c.publishing : c.directButton(copy.text.kinds[item.kind])}
                  </Button>
                )}
                <Button size="sm" variant={route === "direct" ? "outline" : "default"} onClick={() => void publish(item)}>
                  {plan.mode === "intent" ? c.open : copiedId === item.id ? copy.text.copied : c.copyOpen}
                </Button>
                {item.status !== "published" && (
                  <Button size="sm" variant="outline" onClick={() => update(item.id, { status: "published" })}>
                    {c.markPublished}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => onChange(items.filter((i) => i.id !== item.id))}>
                  {c.remove}
                </Button>
              </div>
              {item.url && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {c.published}{" "}
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">
                    {c.view}
                  </a>
                </p>
              )}
              {route === "direct" && !item.url && <p className="mt-2 text-xs text-primary">{c.direct(handle)}</p>}
              {notes[item.id] && (
                <p className="mt-2 text-xs text-destructive" role="status">
                  {notes[item.id]}
                </p>
              )}
              {plan.mode === "copy-open" && route !== "direct" && <p className="mt-2 text-xs text-muted-foreground">{c.copyOpenNote}</p>}
            </li>
          );
        })}
      </ul>
    </StepCard>
  );
}
