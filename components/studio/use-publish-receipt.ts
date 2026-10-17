"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRecords } from "@/hooks/use-records";
import type { Channel, ScenarioContent } from "@/lib/studio/channels";
import { appendPublishLog, usePublishLog, type PublishLogEntry, type PublishOutcome } from "@/lib/studio/publish";

/** The grid's `type` option each channel files under (prototype.config.json → dataGrid). */
export const QUEUE_TYPE: Record<Channel["id"], string> = {
  site: "Blog",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

/**
 * What happens after a publish, shared by the studio and the growth plan: the receipt goes
 * into this browser's log (every page reads the same one, so the weekly report counts
 * both), and a signed-in owner also gets it as a record in the content queue.
 */
export function usePublishReceipt() {
  const { user } = useAuth();
  const { addRecord } = useRecords();
  const log = usePublishLog();
  const [queued, setQueued] = useState(false);

  const onPublished = useCallback(
    async (channel: Channel, content: ScenarioContent, outcome: PublishOutcome) => {
      const entry: PublishLogEntry = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        at: new Date().toISOString(),
        channel: channel.id,
        scenario: content.scenario,
        title: content.title,
        outcome,
        ...(content.kind ? { kind: content.kind } : {}),
        ...(content.ref ? { ref: content.ref } : {}),
      };
      appendPublishLog(entry);
      setQueued(false);
      if (!user || outcome === "failed" || outcome === "cancelled") return;
      const today = new Date().toISOString().slice(0, 10);
      try {
        await addRecord({
          title: content.title.slice(0, 200),
          week: today,
          repository: content.url.replace(/^https?:\/\//, "").slice(0, 200),
          type: QUEUE_TYPE[channel.id],
          status: "Published",
          publishedAt: today,
        });
        setQueued(true);
      } catch (err) {
        console.warn("[studio] content queue write failed:", err);
      }
    },
    [user, addRecord]
  );

  return { user, log, queued, onPublished };
}
