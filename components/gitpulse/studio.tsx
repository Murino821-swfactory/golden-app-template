"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import { useRecords } from "@/hooks/use-records";
import { gitpulseCopy } from "@/lib/gitpulse/copy";
import { recordTypeFor } from "@/lib/gitpulse/share";
import type { Digest, TextKind } from "@/lib/gitpulse/types";
import { config } from "@/lib/prototype-config";
import { AssistantPanel } from "./assistant-panel";
import { MusicPanel, VoicePanel, type MusicResult, type VoiceoverResult } from "./audio-panel";
import { DigestPanel } from "./digest-panel";
import { ImagePanel, type ImageResult } from "./image-panel";
import { PublishPanel, type QueueItem } from "./publish-panel";
import { TextPanel, type TextResult } from "./text-panel";
import { VideoPanel } from "./video-panel";

/**
 * studio.tsx — the creation studio's state: one digest feeding words, a visual, a
 * voiceover, a soundtrack, the Remotion recap and the publish queue. The queue lives in
 * localStorage (a per-viewer convenience); each queued piece is also filed as a Draft in
 * the visitor's own records sandbox, so the dashboard's grid and KPIs tell the same story.
 */

const QUEUE_KEY = "gitpulse-studio:queue";
const EMPTY_QUEUE: QueueItem[] = [];

/**
 * The queue as a tiny external store over localStorage, read through
 * useSyncExternalStore: the prerender sees the empty queue, the browser its own —
 * the sanctioned shape for client-only state, with no setState inside an effect.
 */
let queueCache: QueueItem[] | null = null;
const queueListeners = new Set<() => void>();

function readQueue(): QueueItem[] {
  if (queueCache === null) {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
      queueCache = Array.isArray(parsed) ? (parsed as QueueItem[]) : EMPTY_QUEUE;
    } catch {
      queueCache = EMPTY_QUEUE;
    }
  }
  return queueCache;
}

function writeQueue(items: QueueItem[]) {
  queueCache = items;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    /* private window — the queue just doesn't persist */
  }
  queueListeners.forEach((listener) => listener());
}

function subscribeQueue(listener: () => void): () => void {
  queueListeners.add(listener);
  return () => queueListeners.delete(listener);
}

export function GitpulseStudio() {
  const locale = useLocale();
  const copy = useMemo(() => gitpulseCopy(locale), [locale]);
  const { addRecord, fields } = useRecords();

  const [digest, setDigest] = useState<Digest | null>(null);
  const [texts, setTexts] = useState<Partial<Record<TextKind, TextResult>>>({});
  const [image, setImage] = useState<ImageResult | null>(null);
  const [script, setScript] = useState("");
  const [voiceover, setVoiceover] = useState<VoiceoverResult | null>(null);
  const [useVoiceover, setUseVoiceover] = useState(false);
  const [music, setMusic] = useState<MusicResult | null>(null);
  const [useMusic, setUseMusic] = useState(false);
  const [headline, setHeadline] = useState("");
  const queue = useSyncExternalStore(subscribeQueue, readQueue, () => EMPTY_QUEUE);

  function onDigest(next: Digest) {
    setDigest(next);
    setTexts({});
    setImage(null);
    setVoiceover(null);
    setUseVoiceover(false);
    setMusic(null);
    setUseMusic(false);
    setHeadline(next.highlights?.[0] ?? next.repo);
  }

  function onTextResult(result: TextResult) {
    setTexts((t) => ({ ...t, [result.kind]: result }));
    if (result.kind === "video-script") setScript(result.body);
  }

  function onQueueText(result: TextResult) {
    const item: QueueItem = {
      id: `${result.kind}-${Date.now()}`,
      kind: result.kind,
      title: result.title,
      body: result.body,
      hashtags: result.hashtags,
      status: "draft",
    };
    writeQueue([...queue, item]);
    // Best effort: the same piece as a Draft record, so the dashboard grid moves too.
    if (digest && config.patterns.dataGrid) {
      const typeField = fields.find((f) => f.key === "type");
      const type = recordTypeFor(result.kind, typeField?.options ?? []);
      addRecord({
        title: result.title || result.body.slice(0, 60),
        week: digest.weekOf,
        repository: digest.repo,
        ...(type ? { type } : {}),
        status: "Draft",
      }).catch(() => undefined);
    }
  }

  const queuedKinds = useMemo(() => new Set(queue.map((q) => q.kind)), [queue]);

  return (
    <div className="space-y-6" data-testid="gitpulse-studio">
      <p className="text-sm text-muted-foreground">{copy.page.signedCost}</p>
      <DigestPanel digest={digest} onDigest={onDigest} copy={copy} />
      {digest && (
        <>
          <TextPanel
            digest={digest}
            results={texts}
            onResult={onTextResult}
            onQueue={onQueueText}
            queuedKinds={queuedKinds}
            copy={copy}
          />
          <ImagePanel digest={digest} headline={headline} image={image} onImage={setImage} copy={copy} />
          <VoicePanel
            script={script}
            onScript={setScript}
            voiceover={voiceover}
            onVoiceover={setVoiceover}
            useInVideo={useVoiceover}
            onUseInVideo={setUseVoiceover}
            copy={copy}
          />
          <MusicPanel
            digest={digest}
            music={music}
            onMusic={setMusic}
            useInVideo={useMusic}
            onUseInVideo={setUseMusic}
            copy={copy}
          />
          <VideoPanel
            digest={digest}
            headline={headline}
            onHeadline={setHeadline}
            voiceoverUri={useVoiceover ? voiceover?.dataUri : undefined}
            voiceoverSeconds={useVoiceover ? voiceover?.seconds : undefined}
            musicUri={useMusic ? music?.url : undefined}
            copy={copy}
          />
        </>
      )}
      <PublishPanel items={queue} onChange={writeQueue} copy={copy} image={image} />
      <AssistantPanel digest={digest} copy={copy} />
    </div>
  );
}
