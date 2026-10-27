"use client";

import { useCopy } from "@/hooks/use-workspace";
import { stagesFor, type Deal, type DealStage } from "@/lib/realestate/model";
import { cn } from "@/lib/utils";

/**
 * The rail — the workspace's signature. A deal travels through fixed stations
 * (offer → reservation → contracts → financing → cadastre → handover → closed; rentals skip
 * financing and cadastre). The same drawing appears on the landing, on every deal card
 * and, full size, in the deal drawer, so the product has one picture of its own process.
 */
export function DealRail({ deal, onJump, compact, className }: { deal: Deal; onJump?: (stage: DealStage) => void; compact?: boolean; className?: string }) {
  const c = useCopy();
  const stages = stagesFor(deal.transaction);
  const current = stages.indexOf(deal.stage);
  const lost = deal.status === "lost";
  const openByStage = new Map<DealStage, number>();
  for (const item of deal.checklist) if (!item.done) openByStage.set(item.stage, (openByStage.get(item.stage) ?? 0) + 1);

  if (compact) {
    return (
      <ol aria-label={c.deals.rail} className={cn("flex items-center gap-1", className)}>
        {stages.map((stage, i) => (
          <li key={stage} title={c.stage[stage]} className={cn("h-1.5 flex-1 rounded-full", lost ? "bg-rose-400/40" : i < current ? "bg-foreground/70" : i === current ? "bg-foreground" : "bg-foreground/15")} />
        ))}
      </ol>
    );
  }

  return (
    <ol aria-label={c.deals.rail} className={cn("grid", className)} style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
      {stages.map((stage, i) => {
        const done = i < current || deal.status === "won";
        const active = i === current && deal.status === "open";
        const open = openByStage.get(stage) ?? 0;
        const inner = (
          <>
            {done && !lost && <span aria-hidden className="size-2 rounded-full bg-background" />}
            {active && <span aria-hidden className="size-2.5 rounded-full bg-foreground" />}
          </>
        );
        const stationClass = cn(
          "relative z-10 flex size-6 items-center justify-center rounded-full ring-2 ring-background transition-colors motion-reduce:transition-none",
          lost ? "bg-rose-400/50" : done ? "bg-foreground" : active ? "bg-background outline outline-2 outline-foreground" : "bg-foreground/15",
          onJump && "cursor-pointer hover:scale-110"
        );
        return (
          <li key={stage} className="relative flex flex-col items-center text-center">
            {i > 0 && <span aria-hidden className={cn("absolute left-0 right-1/2 top-3 h-0.5", done || active ? "bg-foreground/70" : "bg-foreground/15")} />}
            {i < stages.length - 1 && <span aria-hidden className={cn("absolute left-1/2 right-0 top-3 h-0.5", done ? "bg-foreground/70" : "bg-foreground/15")} />}
            {onJump ? (
              <button type="button" onClick={() => onJump(stage)} aria-current={active ? "step" : undefined} aria-label={c.stage[stage]} className={stationClass}>
                {inner}
              </button>
            ) : (
              <span aria-current={active ? "step" : undefined} className={stationClass}>
                {inner}
              </span>
            )}
            <span className={cn("mt-2 text-[11px] leading-tight sm:text-xs", active ? "font-semibold" : "hidden text-muted-foreground sm:block")}>{c.stageShort[stage]}</span>
            {open > 0 && i <= current && deal.status === "open" && (
              <span className="mt-0.5 text-[10px] tabular-nums text-amber-300" title={c.deals.openItems(open)}>
                {open}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
