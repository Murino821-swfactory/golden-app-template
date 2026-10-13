"use client";

import { useId, useState } from "react";
import { Bell, CalendarPlus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { googleCalendarUrl, isValidTime, reminderIcs } from "@/lib/checkin-reminder";
import { COPY, type CheckinLocale } from "@/lib/checkin-copy";

/**
 * "Daily reminder" — a recurring calendar event instead of a push server. The time is kept
 * on the device so the dialog opens on the visitor's own choice next time.
 */

const TIME_KEY = "unbroken:reminder-time";
const DEFAULT_TIME = "20:30";

function readTime(): string {
  try {
    const value = window.localStorage.getItem(TIME_KEY);
    return value && isValidTime(value) ? value : DEFAULT_TIME;
  } catch {
    return DEFAULT_TIME;
  }
}

export function ReminderButton({ today, url, locale }: { today: string; url: string; locale: CheckinLocale }) {
  const c = COPY[locale];
  const id = useId();
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState(DEFAULT_TIME);

  const valid = isValidTime(time);
  const input = { time: valid ? time : DEFAULT_TIME, from: today, title: c.remindEventTitle, description: c.remindEventBody, url };
  // A data URL, not an object URL: nothing to revoke, and a few hundred bytes is nothing.
  const icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(reminderIcs(input))}`;

  const openDialog = () => {
    setTime(readTime());
    setOpen(true);
  };

  const remember = (value: string) => {
    setTime(value);
    if (isValidTime(value)) {
      try {
        window.localStorage.setItem(TIME_KEY, value);
      } catch {
        // Nothing to remember in a browser without storage.
      }
    }
  };

  return (
    <>
      <Button type="button" variant="outline" size="lg" onClick={openDialog} data-testid="reminder-open">
        <Bell aria-hidden data-icon="inline-start" />
        {c.remind}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={c.close} aria-describedby={undefined}>
          <DialogTitle>{c.remindTitle}</DialogTitle>
          <DialogDescription>{c.remindBody}</DialogDescription>
          <div className="mt-4 space-y-4">
            <label htmlFor={id} className="flex items-center justify-between gap-4 text-sm font-medium">
              {c.remindTime}
              <input
                id={id}
                type="time"
                value={time}
                onChange={(e) => remember(e.target.value)}
                className="h-11 rounded-lg border border-border bg-background px-3 text-base text-foreground [color-scheme:dark] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild size="lg" disabled={!valid}>
                <a href={googleCalendarUrl(input)} target="_blank" rel="noopener noreferrer" data-testid="reminder-google">
                  <CalendarPlus aria-hidden data-icon="inline-start" />
                  {c.remindGoogle}
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href={icsHref} download="unbroken-reminder.ics" data-testid="reminder-ics">
                  <Download aria-hidden data-icon="inline-start" />
                  {c.remindIcs}
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
