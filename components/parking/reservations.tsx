"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { defaultSlot, isRunning, reservationValues, spotLabel, upcomingReservations, type FormError } from "@/lib/parking";
import { SPOT_LABEL_KEY } from "@/lib/parking-config";
import { useParking } from "./context";
import { CONTROL, FormField, useDayLabel, useFormErrorText, useWriteErrorText } from "./ui";

/**
 * reservations — book a spot for a day and a time window (T-430, feature 2).
 *
 * The list is what is still ahead, soonest first. The form refuses a window that overlaps
 * another reservation of the same spot and says which one is in the way; a reservation that
 * is running shows on the map as "Reserved" without anyone editing the spot.
 */
export function Reservations() {
  const t = useTranslations("parking");
  const { spots, reservations, now, loading, atLimit, count, removeRecord, openReservation } = useParking();
  const describe = useWriteErrorText(count);
  const dayLabel = useDayLabel();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upcoming = upcomingReservations(reservations, now);
  const nameOf = (spotId: string) => {
    const spot = spots.find((s) => s.id === spotId);
    return spot ? spotLabel(spot, SPOT_LABEL_KEY) : t("removedSpot");
  };

  async function cancel(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await removeRecord(id);
      setConfirmingId(null);
    } catch (err) {
      setError(describe(err, "delete"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section data-pattern="parking-reservations" className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">
            {t("reservationsHeading")} <span className="text-muted-foreground">({upcoming.length})</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("reservationsIntro")}</p>
        </div>
        <Button type="button" className="h-11 shrink-0" disabled={loading || atLimit || spots.length === 0} onClick={() => openReservation()}>
          <CalendarPlus className="size-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">{t("newReservation")}</span>
        </Button>
      </div>

      {loading && <Skeleton className="h-16 w-full" />}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {!loading && upcoming.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t("reservationsEmpty")}</p>
      )}

      {!loading && upcoming.length > 0 && (
        <ul className="space-y-3">
          {upcoming.map((r) => (
            <li key={r.id} data-reservation={r.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{nameOf(r.spotId)}</p>
                  <p className="text-sm">
                    {dayLabel(r.date)} · {r.from}–{r.to}
                    {isRunning(r, now) && (
                      <span className="ml-2 rounded-full border border-primary px-2 py-0.5 text-xs text-primary">{t("runningNow")}</span>
                    )}
                  </p>
                  {(r.plate || r.note) && <p className="text-sm text-muted-foreground">{[r.plate, r.note].filter(Boolean).join(" · ")}</p>}
                </div>
                {confirmingId === r.id ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <span className="text-sm">{t("confirmCancelReservation")}</span>
                    <Button type="button" variant="outline" className="h-11 text-destructive" disabled={busyId === r.id} onClick={() => void cancel(r.id)}>
                      {t("confirmCancelAction")}
                    </Button>
                    <Button type="button" variant="ghost" className="h-11" onClick={() => setConfirmingId(null)}>{t("keep")}</Button>
                  </div>
                ) : (
                  <Button type="button" variant="ghost" className="h-11 text-destructive" onClick={() => setConfirmingId(r.id)}>
                    {t("cancelReservation")}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ReservationDialog />
    </section>
  );
}

function ReservationDialog() {
  const { reserving } = useParking();
  if (!reserving) return null;
  return <ReservationForm key={reserving.spotId ?? "any"} initialSpotId={reserving.spotId} />;
}

function ReservationForm({ initialSpotId }: { initialSpotId?: string }) {
  const t = useTranslations("parking");
  const tg = useTranslations("dataGrid");
  const tc = useTranslations("common");
  const { spots, reservations, vehicles, count, addRaw, closeReservation } = useParking();
  const errorText = useFormErrorText();
  const describe = useWriteErrorText(count);
  const [form, setForm] = useState(() => ({
    spotId: initialSpotId ?? (spots.length === 1 ? spots[0]!.id : ""),
    ...defaultSlot(new Date()),
    plate: "",
    note: "",
  }));
  const [errors, setErrors] = useState<FormError[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const errorFor = (key: string) => errorText(errors.find((e) => e.key === key));
  const described = (key: string) => (errors.some((e) => e.key === key) ? `reservation-${key}-error` : undefined);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const { values, errors: found } = reservationValues(form, spots, reservations, new Date());
    setErrors(found);
    if (found.length > 0) return;
    setBusy(true);
    setFormError(null);
    try {
      await addRaw(values);
      closeReservation();
    } catch (err) {
      setFormError(describe(err, "create"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && closeReservation()}>
      <DialogContent closeLabel={tc("close")}>
        <DialogTitle>{t("reservationTitle")}</DialogTitle>
        <DialogDescription className="sr-only">{t("reservationsIntro")}</DialogDescription>
        <form onSubmit={submit} className="mt-4 space-y-4" noValidate data-form="reservation">
          <FormField id="reservation-spotId" label={t("fieldSpot")} required error={errorFor("spotId")}>
            <select id="reservation-spotId" value={form.spotId} onChange={(e) => set("spotId")(e.target.value)} required
              aria-invalid={Boolean(errorFor("spotId"))} aria-describedby={described("spotId")} className={CONTROL}>
              <option value="">{t("chooseSpot")}</option>
              {spots.map((spot) => (
                <option key={spot.id} value={spot.id}>{spotLabel(spot, SPOT_LABEL_KEY)}</option>
              ))}
            </select>
          </FormField>
          <FormField id="reservation-date" label={t("fieldDate")} required error={errorFor("date")}>
            <Input id="reservation-date" type="date" value={form.date} onChange={(e) => set("date")(e.target.value)} required
              aria-invalid={Boolean(errorFor("date"))} aria-describedby={described("date")} className="h-11 text-base sm:text-sm" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField id="reservation-from" label={t("fieldFrom")} required error={errorFor("from")}>
              <Input id="reservation-from" type="time" value={form.from} onChange={(e) => set("from")(e.target.value)} required
                aria-invalid={Boolean(errorFor("from"))} aria-describedby={described("from")} className="h-11 text-base sm:text-sm" />
            </FormField>
            <FormField id="reservation-to" label={t("fieldTo")} required error={errorFor("to")}>
              <Input id="reservation-to" type="time" value={form.to} onChange={(e) => set("to")(e.target.value)} required
                aria-invalid={Boolean(errorFor("to"))} aria-describedby={described("to")} className="h-11 text-base sm:text-sm" />
            </FormField>
          </div>
          <FormField id="reservation-plate" label={t("fieldPlate")} hint={t("optional")} error={errorFor("plate")}>
            <Input id="reservation-plate" value={form.plate} onChange={(e) => set("plate")(e.target.value)} list="reservation-plates"
              autoCapitalize="characters" autoComplete="off" placeholder={t("lookupPlaceholder")}
              aria-invalid={Boolean(errorFor("plate"))} aria-describedby={described("plate")} className="h-11 text-base sm:text-sm" />
            <datalist id="reservation-plates">
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.plate}>{vehicle.driver ?? vehicle.model ?? ""}</option>
              ))}
            </datalist>
          </FormField>
          <FormField id="reservation-note" label={t("fieldNote")} hint={t("optional")} error={errorFor("note")}>
            <Input id="reservation-note" value={form.note} onChange={(e) => set("note")(e.target.value)}
              aria-invalid={Boolean(errorFor("note"))} aria-describedby={described("note")} className="h-11 text-base sm:text-sm" />
          </FormField>

          {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" className="h-11" onClick={closeReservation}>{tg("cancel")}</Button>
            <Button type="submit" className="h-11" disabled={busy}>{busy ? tg("saving") : t("saveReservation")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
