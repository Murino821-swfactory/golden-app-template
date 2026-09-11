"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CheckinToggleProps {
  pillars: string[];
  checkedToday?: string[];
  onCheckin?: (pillar: string) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function CheckinToggle({
  pillars,
  checkedToday = [],
  onCheckin,
  disabled = false,
  className,
}: CheckinToggleProps) {
  const [pending, setPending] = useState<string | null>(null);

  const handleCheckin = async (pillar: string) => {
    if (disabled || pending || checkedToday.includes(pillar)) return;
    setPending(pillar);
    try {
      await onCheckin?.(pillar);
    } finally {
      setPending(null);
    }
  };

  return (
    <div className={cn("flex flex-wrap justify-center gap-2", className)}>
      {pillars.map((pillar) => {
        const isChecked = checkedToday.includes(pillar);
        const isPending = pending === pillar;

        return (
          <Button
            key={pillar}
            variant={isChecked ? "default" : "outline"}
            size="sm"
            disabled={disabled || isPending || isChecked}
            onClick={() => handleCheckin(pillar)}
            className={cn(
              "min-w-[100px] capitalize transition-all",
              isChecked && "bg-primary text-primary-foreground",
              isPending && "animate-pulse"
            )}
          >
            {isPending ? "..." : isChecked ? `✓ ${pillar}` : pillar}
          </Button>
        );
      })}
    </div>
  );
}
