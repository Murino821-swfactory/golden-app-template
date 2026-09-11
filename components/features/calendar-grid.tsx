"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export interface CalendarGridProps {
  checkedDates: Date[];
  month?: Date;
  className?: string;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function CalendarGrid({
  checkedDates,
  month = new Date(),
  className,
}: CalendarGridProps) {
  const { days, firstDayOffset } = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const firstDay = new Date(year, m, 1).getDay();

    return {
      days: Array.from({ length: daysInMonth }, (_, i) => new Date(year, m, i + 1)),
      firstDayOffset: firstDay,
    };
  }, [month]);

  const checkedSet = useMemo(() => {
    return new Set(
      checkedDates.map((d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
    );
  }, [checkedDates]);

  const isChecked = (date: Date) =>
    checkedSet.has(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);

  const today = new Date();

  return (
    <div className={cn("w-full max-w-xs", className)}>
      <div className="mb-2 text-center font-medium text-muted-foreground">
        {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day, i) => (
          <div
            key={i}
            className="text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((date) => {
          const checked = isChecked(date);
          const isToday = isSameDay(date, today);

          return (
            <div
              key={date.getDate()}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md text-sm",
                checked
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/30 text-muted-foreground",
                isToday && !checked && "ring-2 ring-primary ring-offset-1"
              )}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
