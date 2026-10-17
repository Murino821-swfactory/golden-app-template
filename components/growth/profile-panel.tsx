"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Figure } from "@/components/studio/ui";
import type { GrowthCopy } from "@/lib/growth/copy";
import { BIO_MAX, CHECKLIST_IDS, HIGHLIGHT_IDS, checklistProgress, highlightContent, toggleDone } from "@/lib/growth/profile";
import { checklistStore } from "@/lib/growth/store";
import type { ScenarioContent } from "@/lib/studio/channels";
import { cn } from "@/lib/utils";

interface Props {
  copy: GrowthCopy;
  pickedRef: string | null;
  onPick: (content: ScenarioContent) => void;
}

function CopyButton({ text, label, copied }: { text: string; label: string; copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard refused — the text is on screen to select */
        }
      }}
    >
      {done ? copied : label}
    </Button>
  );
}

/** Name, bio variants, the five highlights, the fresh-start checklist and the strategy. */
export function ProfilePanel({ copy, pickedRef, onPick }: Props) {
  const c = copy.profile;
  const done = checklistStore.use();
  const progress = checklistProgress(done);

  return (
    <div className="space-y-8" data-testid="profile-panel">
      <div>
        <h2 className="text-lg font-semibold">{c.heading}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{c.intro}</p>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Figure label={c.handle} value={c.name} small />
        <Figure label={c.checklistHeading} value={`${progress.done} / ${progress.total}`} accent />
        <Figure label={c.highlightsHeading} value={String(HIGHLIGHT_IDS.length)} />
      </dl>

      <section aria-label={c.nameLabel} className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.nameLabel}</p>
            <p className="font-medium">{c.name}</p>
          </div>
          <CopyButton text={c.name} label={c.copy} copied={c.copied} />
        </div>
      </section>

      <section aria-label={c.bioLabel} className="rounded-xl border border-border/60 bg-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.bioLabel}</p>
        <ul className="mt-2 divide-y divide-border/60">
          {c.bios.map((bio, i) => (
            <li key={i} className="flex items-start justify-between gap-3 py-3" data-testid="bio">
              <div className="min-w-0">
                <p className="text-sm">{bio}</p>
                <p className={cn("mt-1 text-xs tabular-nums text-muted-foreground", bio.length > BIO_MAX && "text-destructive")} data-testid="bio-length">
                  {c.bioLimit(bio.length, BIO_MAX)}
                </p>
              </div>
              <CopyButton text={bio} label={c.copy} copied={c.copied} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-label={c.highlightsHeading}>
        <h3 className="text-base font-semibold">{c.highlightsHeading}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{c.highlightsIntro}</p>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HIGHLIGHT_IDS.map((id, i) => {
            const h = c.highlights[id];
            const ref = `highlight:${id}`;
            return (
              <li key={id} className="flex min-w-0 flex-col gap-2 rounded-xl border border-border/60 bg-card p-4" data-testid="highlight">
                <div className="flex items-center gap-3">
                  <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-primary text-sm font-semibold text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium">{h?.title}</p>
                    <p className="text-xs text-muted-foreground">{h?.purpose}</p>
                  </div>
                </div>
                <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                  {h?.stories.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <Button type="button" variant={pickedRef === ref ? "secondary" : "outline"} className="mt-auto h-9" onClick={() => onPick(highlightContent(id, copy))} aria-pressed={pickedRef === ref}>
                  {pickedRef === ref ? copy.plan.picked : c.openAsStory}
                </Button>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-label={c.checklistHeading}>
        <h3 className="text-base font-semibold">{c.checklistHeading}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{c.checklistIntro}</p>
        <ol className="mt-3 divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
          {CHECKLIST_IDS.map((id, i) => {
            const checked = done.includes(id);
            return (
              <li key={id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2 text-sm">
                  <input type="checkbox" checked={checked} onChange={() => checklistStore.set(toggleDone(done, id))} className="size-4 accent-primary" data-testid="checklist-item" data-step={id} />
                  <span className="w-6 shrink-0 tabular-nums text-muted-foreground">{i + 1}.</span>
                  <span className={cn(checked && "text-muted-foreground line-through")}>{c.checklist[id]}</span>
                </label>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-label={c.strategyHeading} className="rounded-xl border border-border/60 bg-card p-4">
        <h3 className="text-base font-semibold">{c.strategyHeading}</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {c.strategy.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
