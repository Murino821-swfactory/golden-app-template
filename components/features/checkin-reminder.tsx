"use client";

import { useId, useState } from "react";
import { Bell, CalendarPlus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { googleCalendarUrl, isValidTime, reminderIcs } from "@/lib/checkin-reminder";
import { COPY, type CheckinLocale } from "@/lib/checkin-copy";
import { DAILY_COPY } from "@/lib/checkin-daily-copy";
import { useAuth } from "@/hooks/use-auth";
import { disablePush, enablePush, pushAvailability, pushStatus, type PushAvailability, type PushStatus } from "@/lib/checkin-push";

/**
 * Per-device push settings plus an optional recurring calendar reminder. The server is
 * authoritative for enabled push; the device remembers calendar-only time choices.
 */

const TIME_KEY = "unbroken:reminder-time";
const DEFAULT_TIME = "08:00";

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
  const d = DAILY_COPY[locale];
  const { user } = useAuth();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState(DEFAULT_TIME);
  const [availability, setAvailability] = useState<PushAvailability | null>(null);
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const valid = isValidTime(time);
  const input = { time: valid ? time : DEFAULT_TIME, from: today, title: c.remindEventTitle, description: c.remindEventBody, url };
  // A data URL, not an object URL: nothing to revoke, and a few hundred bytes is nothing.
  const icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(reminderIcs(input))}`;

  const openDialog = async () => {
    setTime(readTime());
    setOpen(true);
    setBusy(true);
    setError(false);
    setStatus(null);
    try {
      setAvailability(await pushAvailability());
      if (user) {
        const current = await pushStatus();
        setStatus(current);
        if (current.enabled && current.time) setTime(current.time);
      }
    } catch { setError(true); }
    finally { setBusy(false); }
  };

  const savePush = async (off = false) => {
    setBusy(true);
    setError(false);
    try { setStatus(await (off ? disablePush() : enablePush(time, locale))); }
    catch { setError(true); }
    finally { setBusy(false); setAvailability(await pushAvailability()); }
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
          <DialogDescription>{d.pushBody}</DialogDescription>
          <div className="mt-4 space-y-4">
            <label htmlFor={id} className="flex items-center justify-between gap-4 text-sm font-medium">
              {c.remindTime}
              <input
                id={id}
                type="time"
                disabled={busy}
                value={time}
                onChange={(e) => remember(e.target.value)}
                className="h-11 rounded-lg border border-border bg-background px-3 text-base text-foreground [color-scheme:dark] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <p className="text-xs text-muted-foreground">{status?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
            {!user && <p>{d.signIn}</p>}
            {availability && availability !== "ready" && <p className="text-sm">{d[availability]}</p>}
            {status && <p role="status" className="text-sm">{status.enabled ? `${d.enabled} · ${status.time}` : d.disabled}</p>}
            {error && <p role="alert" className="text-sm">{d.error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button disabled={!user || busy || !valid || availability !== "ready"} onClick={() => void savePush()}>
                {busy ? d.busy : status?.enabled ? d.update : d.enable}
              </Button>
              {status?.enabled && <Button variant="outline" disabled={busy} onClick={() => void savePush(true)}>{d.disable}</Button>}
            </div>
            <p className="pt-3 text-sm font-medium">{d.calendar}</p>
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
