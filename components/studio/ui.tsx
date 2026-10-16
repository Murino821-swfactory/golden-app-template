import { cn } from "@/lib/utils";

/** One number with its label — the strip above each scene and the HUD of the game. */
export function Figure({ label, value, small, accent }: { label: string; value: string; small?: boolean; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("truncate font-semibold tabular-nums", small ? "text-base" : "text-2xl", accent && "text-primary")} title={value}>
        {value}
      </dd>
    </div>
  );
}

/** A pill-shaped toggle between two or more modes. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg border border-border/60 bg-card p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={o.id === value}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition-colors",
            o.id === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
