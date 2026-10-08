"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useCopyRewrite } from "@/hooks/use-copy-rewrite";
import {
  INSTRUCTIONS_MAX_CHARS,
  charCount,
  copyPanelView,
  diffCopy,
  estimateTokens,
  formatEur,
  formatPercent,
  formatSeconds,
  type CopyMetricsView,
} from "@/lib/copy-rewrite";
import { cn } from "@/lib/utils";

/**
 * "Edit texts" — the prototype's creator and the founder rewrite its copy with their own
 * instructions (sw-factory spec 2026-09-30-prototype-copy-rewrite-design.md §8). Rendered
 * only when the server named one of those two roles; everyone else gets nothing, not a
 * disabled button. The dialog is a bottom sheet on phones (golden rule 2); 44 px targets.
 */
export function CopyRewriteControls() {
  const t = useTranslations("copyRewrite");
  const tc = useTranslations("common");
  const copy = useCopyRewrite();
  const [open, setOpen] = useState(false);
  const status = copy.status;
  if (!status) return null;

  const view = copyPanelView({
    status,
    instructions: copy.instructions,
    working: copy.working,
    timedOut: copy.timedOut,
    actionError: copy.actionError,
  });
  const draft = status.latestDraft;
  const metrics = draft?.metrics ?? null;
  const diffs = view.showPreview && draft?.content ? diffCopy(draft.baseContent, draft.content) : [];
  const changed = diffs.filter((d) => d.changed);
  const length = charCount(copy.instructions);

  return (
    <div className="relative mx-auto flex w-full max-w-5xl justify-center px-4 pb-8">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full sm:w-auto"
        data-copy-rewrite-open
        onClick={() => setOpen(true)}
      >
        {t("open")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={tc("close")} className="sm:max-w-2xl" data-copy-rewrite-panel>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>

          <div className="mt-4 flex flex-col gap-2">
            <label htmlFor="copy-rewrite-instructions" className="text-sm font-medium">
              {t("instructions")}
            </label>
            <Textarea
              id="copy-rewrite-instructions"
              rows={8}
              value={copy.instructions}
              onChange={(e) => copy.setInstructions(e.target.value)}
              aria-invalid={length > INSTRUCTIONS_MAX_CHARS || undefined}
              className="min-h-40 font-mono text-sm"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {t("chars", { count: length, max: INSTRUCTIONS_MAX_CHARS })} ·{" "}
                {t("tokens", { count: estimateTokens(copy.instructions) })}
              </span>
              <Button
                type="button"
                variant="ghost"
                className="h-11"
                disabled={copy.working || (status.isDefault && copy.instructions === status.instructions)}
                onClick={() => void copy.resetPrompt()}
              >
                {t("reset")}
              </Button>
            </div>
            <details className="rounded-lg border border-border p-3 text-sm">
              <summary className="cursor-pointer select-none">{t("fullPrompt")}</summary>
              {draft?.systemPrompt && draft.userPrompt ? (
                <div className="mt-3 flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    {t("promptSizes", {
                      system: charCount(draft.systemPrompt),
                      user: charCount(draft.userPrompt),
                    })}
                  </p>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-2 text-xs">
                    {draft.systemPrompt}
                    {"\n\n"}
                    {draft.userPrompt}
                  </pre>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">{t("fullPromptEmpty")}</p>
              )}
            </details>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Button
              type="button"
              className="h-11 w-full"
              disabled={!view.canDraft}
              aria-busy={view.draftLabel === "drafting" || undefined}
              onClick={() => void copy.draft()}
            >
              {t(view.draftLabel)}
            </Button>
            {status.draftsLeftToday !== null && (
              <p className="text-center text-xs text-muted-foreground">
                {t("draftsLeft", { count: status.draftsLeftToday })}
              </p>
            )}
            <p aria-live="polite" className="min-h-5 text-center text-sm">
              {view.message ? t(view.message.key, view.message.values) : ""}
            </p>
            {copy.actionError === "no-credits" && copy.pricingUrl && (
              <Button asChild variant="link" className="h-11">
                <a href={copy.pricingUrl} target="_blank" rel="noopener noreferrer">
                  {t("buyCredits")}
                </a>
              </Button>
            )}
            {view.published && (
              <Button type="button" variant="outline" className="h-11" onClick={() => window.location.reload()}>
                {t("reload")}
              </Button>
            )}
          </div>

          {view.showPreview && draft && (
            <section className="mt-4 flex flex-col gap-3" data-copy-rewrite-preview>
              <h3 className="text-base font-semibold">{t("preview")}</h3>
              {metrics && <MetricsGrid metrics={metrics} />}
              <p className="text-xs text-muted-foreground">
                {t("changedOf", { changed: changed.length, total: diffs.length })}
              </p>
              <ul className="flex flex-col gap-3">
                {changed.map((d) => (
                  <li key={`${d.locale}:${d.path}`} className="rounded-lg border border-border p-3 text-sm">
                    <p className="mb-1 font-mono text-xs text-muted-foreground">
                      {d.locale} · {d.path}
                    </p>
                    {d.before !== null && (
                      <p className="text-muted-foreground">
                        <span className="font-medium">{t("before")}: </span>
                        {d.before}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">{t("after")}: </span>
                      {d.after}
                    </p>
                  </li>
                ))}
              </ul>
              {view.publish && (
                <Button
                  type="button"
                  className="h-11 w-full"
                  disabled={view.publish.disabled}
                  aria-busy={view.publish.label === "publishing" || undefined}
                  onClick={() => void copy.publish()}
                >
                  {view.publish.label === "publishing" ? t("publishingButton") : t(view.publish.label)}
                </Button>
              )}
            </section>
          )}

          {status.history.length > 0 && (
            <details className="mt-4 rounded-lg border border-border p-3 text-sm">
              <summary className="cursor-pointer select-none">{t("history")}</summary>
              <ul className="mt-2 flex flex-col gap-1 text-xs">
                {status.history.map((h) => (
                  <li key={h.id} className="flex flex-wrap gap-x-3 gap-y-1">
                    <span>{new Date(h.createdAt).toLocaleString()}</span>
                    <span>{h.kind === "draft" ? t("kindDraft") : t("kindPublish")}</span>
                    <span className={cn(h.status === "failed" && "text-destructive")}>{h.status}</span>
                    {h.instructionsHash && <span className="font-mono">#{h.instructionsHash.slice(0, 6)}</span>}
                    {h.metrics && h.metrics.tokensOut > 0 && (
                      <>
                        <span>{t("metrics.tokensOutShort", { count: h.metrics.tokensOut })}</span>
                        <span>{formatEur(h.metrics.costEur)}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricsGrid({ metrics }: { metrics: CopyMetricsView }) {
  const t = useTranslations("copyRewrite.metrics");
  const rows: Array<[string, string]> = [
    [t("cost"), formatEur(metrics.costEur)],
    [t("tokensOut"), String(metrics.tokensOut)],
    [t("tokensIn"), String(metrics.tokensIn + metrics.cacheRead + metrics.cacheWrite)],
    [t("copyChars"), String(metrics.copyChars)],
    [t("eurPer1k"), formatEur(metrics.eurPer1kChars)],
    [t("jsonOverhead"), formatPercent(metrics.jsonOverhead)],
    [t("changed"), `${metrics.fieldsChanged} / ${metrics.fieldsTotal}`],
    [t("duration"), formatSeconds(metrics.durationMs)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-border p-3 text-sm sm:grid-cols-4">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="font-medium tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
