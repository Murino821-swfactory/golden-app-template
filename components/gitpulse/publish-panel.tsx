"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import type { GitpulseCopy } from "@/lib/gitpulse/copy";
import { composeShareText, sharePlan } from "@/lib/gitpulse/share";
import type { TextKind } from "@/lib/gitpulse/types";
import { localeHref } from "@/lib/locale-routing";
import { StepCard } from "./ui";

/**
 * The publish queue — where "buttons that represent publishing" become buttons that
 * publish. X, LinkedIn and Facebook open the visitor's own prefilled composer; the
 * clipboard platforms copy the caption and open the platform, and the note says so.
 * No social credential ever touches the demo.
 */

export type QueueStatus = "draft" | "review" | "published";

export interface QueueItem {
  id: string;
  kind: TextKind;
  title: string;
  body: string;
  hashtags: string[];
  status: QueueStatus;
}

export function PublishPanel({ items, onChange, copy }: {
  items: QueueItem[];
  onChange: (items: QueueItem[]) => void;
  copy: GitpulseCopy;
}) {
  const locale = useLocale();
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  return (
    <StepCard title={c.title} description={c.intentNote}>
      {items.length === 0 && <p className="text-sm text-muted-foreground">{c.empty}</p>}
      <ul className="space-y-3">
        {items.map((item) => {
          // Only the mode is needed for labels; the real URL is resolved on click.
          const plan = sharePlan(item.kind, "", "");
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
                <Button size="sm" onClick={() => void publish(item)}>
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
              {plan.mode === "copy-open" && <p className="mt-2 text-xs text-muted-foreground">{c.copyOpenNote}</p>}
            </li>
          );
        })}
      </ul>
    </StepCard>
  );
}
