"use client";

import { cn } from "@/lib/utils";
import { PILLARS, type DayKey, type HeatCell, type PillarId } from "@/lib/checkin-engine";

/**
 * The two pictures of the check-in (OTH-84): the week's balance as a pentagon — five
 * pillars, five corners — and the month as a GitHub-style grid. Inline SVG and CSS grid,
 * no chart library, palette tokens only so the palette switcher repaints them.
 */

const SIZE = 280;
const C = SIZE / 2;
const R = 88;
const PAD = 28;

function point(i: number, r: number): [number, number] {
  const a = ((-90 + i * 72) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

const ring = (f: number) => PILLARS.map((_, i) => point(i, R * f).join(",")).join(" ");

export function BalanceRadar({
  values,
  labels,
  ariaLabel,
}: {
  values: Record<PillarId, number>;
  labels: Record<PillarId, string>;
  ariaLabel: string;
}) {
  const shape = PILLARS.map(({ id }, i) => point(i, R * values[id]));

  return (
    // Side margin: the left and right labels ("Habits", "Fitness") sit outside the pentagon.
    <svg viewBox={`${-PAD} 0 ${SIZE + 2 * PAD} ${SIZE}`} role="img" aria-label={ariaLabel} className="mx-auto w-full max-w-96">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} className="fill-none stroke-muted-foreground/25" strokeWidth={1} />
      ))}
      {PILLARS.map((_, i) => {
        const [x, y] = point(i, R);
        return <line key={i} x1={C} y1={C} x2={x} y2={y} className="stroke-muted-foreground/25" strokeWidth={1} />;
      })}
      <polygon
        points={shape.map((p) => p.join(",")).join(" ")}
        className="fill-primary/30 stroke-primary transition-all duration-300 motion-reduce:transition-none"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {shape.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.5} className="fill-primary" />
      ))}
      {PILLARS.map(({ id }, i) => {
        const [x, y] = point(i, R + 22);
        const anchor = x > C + 4 ? "start" : x < C - 4 ? "end" : "middle";
        const dy = i === 0 ? -6 : y > C ? 10 : 0;
        return (
          <text key={id} x={x} y={y + dy} textAnchor={anchor} className="fill-foreground text-[11px] font-semibold">
            {labels[id]}
            <tspan x={x} dy={13} className="fill-muted-foreground font-normal tabular-nums">
              {Math.round(values[id] * 100)}%
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}

const LEVEL = [
  "bg-muted-foreground/15",
  "bg-primary/25",
  "bg-primary/45",
  "bg-primary/65",
  "bg-primary/85",
  "bg-primary",
];

export function MonthHeatmap({
  weeks,
  today,
  selected,
  onSelect,
  cellLabel,
  weekdayLabels,
  less,
  more,
}: {
  weeks: (HeatCell | null)[][];
  today: DayKey;
  selected: DayKey;
  onSelect: (day: DayKey) => void;
  cellLabel: (cell: HeatCell) => string;
  weekdayLabels: [string, string, string];
  less: string;
  more: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <div aria-hidden className="grid grid-rows-7 gap-1.5 pr-1 text-[11px] text-muted-foreground">
          {Array.from({ length: 7 }, (_, row) => (
            <span key={row} className="flex h-9 items-center">
              {row === 0 ? weekdayLabels[0] : row === 2 ? weekdayLabels[1] : row === 4 ? weekdayLabels[2] : ""}
            </span>
          ))}
        </div>
        {weeks.map((week, w) => (
          <div key={w} className="grid grid-rows-7 gap-1.5">
            {week.map((cell, d) =>
              cell === null ? (
                <span key={d} className="size-9" />
              ) : (
                <button
                  key={cell.key}
                  type="button"
                  data-heat-day={cell.key}
                  data-testid={cell.key === today ? "heat-today" : undefined}
                  disabled={cell.future}
                  aria-label={cellLabel(cell)}
                  aria-current={cell.key === selected ? "date" : undefined}
                  onClick={() => onSelect(cell.key)}
                  className={cn(
                    "size-9 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    cell.future ? "bg-transparent ring-1 ring-inset ring-muted-foreground/15" : LEVEL[cell.count],
                    cell.key === selected && "ring-2 ring-foreground ring-offset-2 ring-offset-card"
                  )}
                />
              )
            )}
          </div>
        ))}
      </div>
      <div aria-hidden className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="mr-1">{less}</span>
        {LEVEL.map((c) => (
          <span key={c} className={cn("size-3 rounded-sm", c)} />
        ))}
        <span className="ml-1">{more}</span>
      </div>
    </div>
  );
}
