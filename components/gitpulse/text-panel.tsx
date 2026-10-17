"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { generateText } from "@/lib/gitpulse/api";
import type { GitpulseCopy } from "@/lib/gitpulse/copy";
import { getIdToken } from "@/lib/gitpulse/token";
import { TEXT_KINDS, type Digest, type GeneratedText, type GitpulseLocale, type TextKind, type UiError } from "@/lib/gitpulse/types";
import { CostChip, ErrorLine, PillGroup, StepCard } from "./ui";

/**
 * Step 2 — words. One kind at a time: pick the channel, generate, edit in place, queue.
 * The body stays editable because the marketing skills write the draft, the human ships it.
 */

export interface TextResult extends GeneratedText {
  kind: TextKind;
  costUsd: number;
}

export function TextPanel({ digest, results, onResult, onQueue, queuedKinds, copy }: {
  digest: Digest | null;
  results: Partial<Record<TextKind, TextResult>>;
  onResult: (result: TextResult) => void;
  onQueue: (result: TextResult) => void;
  queuedKinds: ReadonlySet<TextKind>;
  copy: GitpulseCopy;
}) {
  const locale = useLocale() as GitpulseLocale;
  const [kind, setKind] = useState<TextKind>("blog");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const [copied, setCopied] = useState(false);
  const c = copy.text;
  const current = results[kind] ?? null;

  async function generate() {
    if (!digest || busy) return;
    setBusy(true);
    setError(null);
    const out = await generateText(
      { kind, locale, digest, instructions: instructions.trim() || undefined },
      getIdToken
    );
    setBusy(false);
    if (out.ok) onResult({ kind, ...out.data.content, costUsd: out.data.costUsd });
    else setError(out.error);
  }

  async function copyBody() {
    if (!current) return;
    try {
      await navigator.clipboard.writeText([current.title, current.body].filter(Boolean).join("\n\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard denied — the textarea below is selectable */
    }
  }

  return (
    <StepCard title={c.step}>
      <PillGroup options={TEXT_KINDS} value={kind} onChange={(k) => { setKind(k); setError(null); }} labels={c.kinds} />
      <div>
        <label className="text-xs text-muted-foreground" htmlFor="gitpulse-instructions">{c.instructionsLabel}</label>
        <Input
          id="gitpulse-instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder={c.instructionsPlaceholder}
          maxLength={500}
          className="mt-1 h-10"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void generate()} disabled={!digest || busy} className="h-10" data-testid="gitpulse-generate-text">
          {busy ? c.generating : current ? c.regenerate : c.generate}
        </Button>
        <CostChip label={c.cost} costUsd={current ? current.costUsd : null} />
      </div>
      <ErrorLine error={error} copy={copy} />

      {current && (
        <div className="space-y-2" data-testid="gitpulse-text-result">
          {current.title && (
            <Input
              value={current.title}
              onChange={(e) => onResult({ ...current, title: e.target.value })}
              className="h-10 font-medium"
              aria-label="title"
            />
          )}
          <Textarea
            value={current.body}
            onChange={(e) => onResult({ ...current, body: e.target.value })}
            rows={Math.min(14, Math.max(4, Math.ceil(current.body.length / 70)))}
            className="text-sm leading-relaxed"
            aria-label="body"
          />
          {current.hashtags.length > 0 && (
            <p className="text-sm text-primary">{current.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-9" onClick={() => void copyBody()}>
              {copied ? c.copied : c.copy}
            </Button>
            <Button
              variant="secondary"
              className="h-9"
              disabled={queuedKinds.has(kind)}
              onClick={() => onQueue(current)}
              data-testid="gitpulse-queue-text"
            >
              {queuedKinds.has(kind) ? c.queued : c.queue}
            </Button>
          </div>
        </div>
      )}
    </StepCard>
  );
}
