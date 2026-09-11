"use client";

import { cn } from "@/lib/utils";

export interface StreakCounterProps {
  currentStreak: number;
  label?: string;
  className?: string;
}

export function StreakCounter({
  currentStreak,
  label = "day streak",
  className,
}: StreakCounterProps) {
  const isActive = currentStreak > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full px-4 py-2",
        isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        className
      )}
    >
      <span className="text-2xl" role="img" aria-label="fire">
        {isActive ? "🔥" : "💤"}
      </span>
      <span className="font-semibold tabular-nums">
        {currentStreak}
      </span>
      <span className="text-sm">
        {label}
      </span>
    </div>
  );
}
