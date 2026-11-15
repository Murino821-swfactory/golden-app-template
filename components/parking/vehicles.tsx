"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { lookupPlate, normalizePlate, spotLabel, spotLocation, vehicleValues, type FormError, type Vehicle } from "@/lib/parking";
import { SPOT_LABEL_KEY } from "@/lib/parking-config";
import { useParking } from "./context";
import { CONTROL, FormField, useFormErrorText, useWriteErrorText } from "./ui";

/**
 * vehicles — the licence plate register (T-430, feature 3).
 *
 * A car is its plate, optionally a model, a driver and the spot it belongs to. The lookup
 * answers "whose car is this?" from any part of the plate, typed any way (`ba 123`,
 * `BA-123AB`); a hit leads to the driver, the spot and its pin on the map.
 */
export function Vehicles() {
  const t = useTranslations("parking");
  const { spots, vehicles, loading, atLimit, select } = useParking();
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<{ vehicle?: Vehicle } | null>(null);

  const searching = normalizePlate(query).length >= 2;
  const shown = searching ? lookupPlate(vehicles, query) : vehicles;
  const spotOf = (vehicle: Vehicle) => spots.find((s) => s.id === vehicle.spotId);

  const showOnMap = (spotId: string) => {
    select(spotId);
    document.getElementById("parking-map")?.scrollIntoView({ block: "start" });
  };

  return (
    <section data-pattern="parking-vehicles" className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">
            {t("vehiclesHeading")} <span className="text-muted-foreground">({vehicles.length})</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("vehiclesIntro")}</p>
        </div>
        <Button type="button" className="h-11 shrink-0" disabled={loading || atLimit} onClick={() => setDialog({})}>
          <Plus className="size-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">{t("addVehicle")}</span>
        </Button>
      </div>

      {vehicles.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <label htmlFor="plate-lookup" className="sr-only">{t("lookupLabel")}</label>
          <Input id="plate-lookup" type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={t("lookupLabel")} autoCapitalize="characters" autoComplete="off" className="h-11 pl-9 text-base sm:text-sm" />
        </div>
      )}

      {searching && (
        <p role="status" data-lookup-result className="text-sm text-muted-foreground">
          {shown.length > 0 ? t("lookupFound", { count: shown.length }) : t("lookupNone")}
        </p>
      )}

      {loading && <Skeleton className="h-16 w-full" />}

      {!loading && vehicles.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t("vehiclesEmpty")}</p>
      )}

      {!loading && shown.length > 0 && (
        <ul className="space-y-3">
          {shown.map((vehicle) => {
            const spot = spotOf(vehicle);
            return (
              <li key={vehicle.id} data-vehicle={vehicle.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p data-plate className="inline-block rounded-md border border-border bg-background px-2 py-0.5 font-mono text-base tracking-widest">
                      {vehicle.plate}
                    </p>
                    {(vehicle.model || vehicle.driver) && <p className="text-sm">{[vehicle.model, vehicle.driver].filter(Boolean).join(" · ")}</p>}
                    <p className="text-sm text-muted-foreground">
                      {t("fieldAssignedSpot")}: {spot ? spotLabel(spot, SPOT_LABEL_KEY) : t("noSpot")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {spot && spotLocation(spot.values) && (
                      <Button type="button" variant="outline" className="h-11" onClick={() => showOnMap(spot.id)}>{t("showOnMap")}</Button>
                    )}
                    <Button type="button" variant="ghost" className="h-11" data-edit-vehicle={vehicle.id} onClick={() => setDialog({ vehicle })}>
                      {t("edit")}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {dialog && <VehicleForm key={dialog.vehicle?.id ?? "new"} vehicle={dialog.vehicle} onClose={() => setDialog(null)} />}
    </section>
  );
}

function VehicleForm({ vehicle, onClose }: { vehicle?: Vehicle; onClose: () => void }) {
  const t = useTranslations("parking");
  const tg = useTranslations("dataGrid");
  const tc = useTranslations("common");
  const { spots, vehicles, count, addRaw, setRaw, removeRecord } = useParking();
  const errorText = useFormErrorText();
  const describe = useWriteErrorText(count);
  const [form, setForm] = useState(() => ({
    plate: vehicle?.plate ?? "",
    model: vehicle?.model ?? "",
    driver: vehicle?.driver ?? "",
    spotId: vehicle?.spotId ?? "",
  }));
  const [errors, setErrors] = useState<FormError[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const set = (key: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const errorFor = (key: string) => errorText(errors.find((e) => e.key === key));
  const described = (key: string) => (errors.some((e) => e.key === key) ? `vehicle-${key}-error` : undefined);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const { values, errors: found } = vehicleValues(form, spots, vehicles, vehicle?.id);
    setErrors(found);
    if (found.length > 0) return;
    setBusy(true);
    setFormError(null);
    try {
      if (vehicle) await setRaw(vehicle.id, values);
      else await addRaw(values);
      onClose();
    } catch (err) {
      setFormError(describe(err, vehicle ? "update" : "create"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!vehicle) return;
    setBusy(true);
    setFormError(null);
    try {
      await removeRecord(vehicle.id);
      onClose();
    } catch (err) {
      setFormError(describe(err, "delete"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <DialogTitle>{vehicle ? t("editVehicle") : t("addVehicle")}</DialogTitle>
        <DialogDescription className="sr-only">{t("vehiclesIntro")}</DialogDescription>
        <form onSubmit={submit} className="mt-4 space-y-4" noValidate data-form="vehicle">
          <FormField id="vehicle-plate" label={t("fieldPlate")} required error={errorFor("plate")}>
            <Input id="vehicle-plate" value={form.plate} onChange={(e) => set("plate")(e.target.value)} required
              autoCapitalize="characters" autoComplete="off" placeholder={t("lookupPlaceholder")}
              aria-invalid={Boolean(errorFor("plate"))} aria-describedby={described("plate")} className="h-11 font-mono text-base tracking-widest sm:text-sm" />
          </FormField>
          <FormField id="vehicle-model" label={t("fieldModel")} hint={t("optional")} error={errorFor("model")}>
            <Input id="vehicle-model" value={form.model} onChange={(e) => set("model")(e.target.value)}
              aria-invalid={Boolean(errorFor("model"))} aria-describedby={described("model")} className="h-11 text-base sm:text-sm" />
          </FormField>
          <FormField id="vehicle-driver" label={t("fieldDriver")} hint={t("optional")} error={errorFor("driver")}>
            <Input id="vehicle-driver" value={form.driver} onChange={(e) => set("driver")(e.target.value)}
              aria-invalid={Boolean(errorFor("driver"))} aria-describedby={described("driver")} className="h-11 text-base sm:text-sm" />
          </FormField>
          <FormField id="vehicle-spotId" label={t("fieldAssignedSpot")} hint={t("optional")}>
            <select id="vehicle-spotId" value={form.spotId} onChange={(e) => set("spotId")(e.target.value)} className={CONTROL}>
              <option value="">{t("noSpot")}</option>
              {spots.map((spot) => (
                <option key={spot.id} value={spot.id}>{spotLabel(spot, SPOT_LABEL_KEY)}</option>
              ))}
            </select>
          </FormField>

          {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
            {vehicle ? (
              confirming ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="text-sm">{t("confirmDeleteVehicle")}</span>
                  <Button type="button" variant="outline" className="h-11 text-destructive" disabled={busy} onClick={() => void remove()}>
                    {tg("confirmDeleteAction")}
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="ghost" className="h-11 text-destructive" onClick={() => setConfirming(true)}>{tg("delete")}</Button>
              )
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="ghost" className="h-11" onClick={onClose}>{tg("cancel")}</Button>
              <Button type="submit" className="h-11" disabled={busy}>{busy ? tg("saving") : tg("save")}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
