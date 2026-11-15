"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SPOT_STATUSES,
  effectiveStatus,
  spotLabel,
  spotLocation,
  spotPins,
  statusCounts,
  unplacedSpots,
  upcomingReservations,
  withLocation,
  type LatLng,
  type SpotStatus,
} from "@/lib/parking";
import { MAP_CENTRE, MAP_ZOOM, SPOT_LABEL_KEY, SPOT_TYPE_KEY } from "@/lib/parking-config";
import type { EntityRecord } from "@/lib/records";
import { cn } from "@/lib/utils";
import { useParking } from "./context";
import { PARKING_MAP_STYLE } from "./map-style";
import { STATUS_LOOK, StatusBadge, useDayLabel, useWriteErrorText } from "./ui";

/**
 * parking-map — the register on the map (T-430, feature 1).
 *
 * Every spot that has a place is a pin in the state it has right now; a spot without one is
 * offered for placing: choose it, tap the map, done. The pin is a real button (keyboard and
 * screen reader reach it), its look is the status (see `STATUS_LOOK`), and choosing one
 * opens the spot's card with "Reserve" and "Move the pin".
 *
 * The map is built once and the pins are redrawn on it — a write must not rebuild the map
 * under the visitor's finger. MapLibre is imported inside an effect for the same reason as
 * in `map-base`: it touches `window` at module scope and the page is a static export.
 * Its stylesheet arrives with `map-base`, which the dashboard page imports either way; a
 * second import here would break the grid's emulator fixture (integration/record-focus),
 * whose bundler takes no CSS.
 */

const PIN = "flex size-11 cursor-pointer items-center justify-center rounded-full border-2 text-sm font-semibold shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const PIN_SELECTED = ["ring-2", "ring-ring", "ring-offset-2", "ring-offset-background"];

export function ParkingMap() {
  const t = useTranslations("parking");
  const tm = useTranslations("map");
  const { spots, reservations, now, loading, count, selectedId, select, setRaw, openReservation } = useParking();
  const describe = useWriteErrorText(count);
  const dayLabel = useDayLabel();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const libRef = useRef<typeof import("maplibre-gl") | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const fittedRef = useRef(false);
  const clickRef = useRef<(at: LatLng) => void>(() => {});
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [placingId, setPlacingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);

  // Read once: a language switch is a new document, and a new object would rebuild the map.
  const [locale] = useState<Record<string, string>>(() => ({
    "Map.Title": tm("title"),
    "Marker.Title": tm("marker"),
    "Popup.Close": tm("popupClose"),
    "NavigationControl.ZoomIn": tm("zoomIn"),
    "NavigationControl.ZoomOut": tm("zoomOut"),
    "NavigationControl.ResetBearing": tm("resetBearing"),
    "AttributionControl.ToggleAttribution": tm("toggleAttribution"),
    "CooperativeGesturesHandler.MobileHelpText": tm("gestureMobile"),
    "CooperativeGesturesHandler.WindowsHelpText": tm("gestureWindows"),
    "CooperativeGesturesHandler.MacHelpText": tm("gestureMac"),
  }));
  const [statusLabels] = useState<Record<SpotStatus, string>>(() => ({
    available: t("status.available"),
    occupied: t("status.occupied"),
    reserved: t("status.reserved"),
  }));

  const livePins = spotPins(spots, reservations, now, SPOT_LABEL_KEY);
  const pinsKey = JSON.stringify(livePins);
  // The clock ticks every minute; the pins are redrawn only when one of them changed.
  const pins = useMemo(() => livePins, [pinsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const unplaced = useMemo(() => unplacedSpots(spots), [spots]);
  const counts = statusCounts(spots, reservations, now);
  const selected = spots.find((spot) => spot.id === selectedId) ?? null;
  const placing = spots.find((spot) => spot.id === placingId) ?? null;

  async function place(spot: EntityRecord, at: LatLng) {
    setBusy(true);
    setWriteError(null);
    try {
      await setRaw(spot.id, withLocation(spot.values, at));
      setNotice(t("placed", { spot: spotLabel(spot, SPOT_LABEL_KEY) }));
      setPlacingId(null);
      select(spot.id);
    } catch (err) {
      setWriteError(describe(err, "update"));
    } finally {
      setBusy(false);
    }
  }

  // The map's click listener is registered once; this keeps what it does current.
  useEffect(() => {
    clickRef.current = (at) => {
      if (placing && !busy) void place(placing, at);
    };
  });

  useEffect(() => {
    if (!containerRef.current) return;
    let instance: MapLibreMap | null = null;
    let cancelled = false;
    let loaded = false;
    const markers = markersRef.current;

    void (async () => {
      try {
        const maplibre = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;
        instance = new maplibre.Map({
          container: containerRef.current,
          style: PARKING_MAP_STYLE,
          center: [MAP_CENTRE.lng, MAP_CENTRE.lat],
          zoom: MAP_ZOOM,
          attributionControl: { compact: true },
          cooperativeGestures: true,
          locale,
        });
        instance.addControl(new maplibre.NavigationControl(), "top-right");
        instance.on("load", () => {
          loaded = true;
          if (!cancelled) setReady(true);
        });
        // After `load`, an error is one tile; before it, the map has nothing to draw.
        instance.on("error", (e) => {
          if (loaded || cancelled) return;
          console.error("[parking-map] the map style failed to load:", e.error);
          setFailed(true);
        });
        instance.on("click", (e) => clickRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
        libRef.current = maplibre;
        setMap(instance);
      } catch (err) {
        console.error("[parking-map] failed to initialise MapLibre:", err);
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      markers.forEach((marker) => marker.remove());
      markers.clear();
      fittedRef.current = false;
      instance?.remove();
      setMap(null);
    };
  }, [locale]);

  // Pins: one button per placed spot.
  useEffect(() => {
    const maplibre = libRef.current;
    if (!map || !maplibre) return;
    const markers = markersRef.current;
    markers.forEach((marker) => marker.remove());
    markers.clear();
    for (const pin of pins) {
      const el = document.createElement("button");
      el.type = "button";
      el.dataset.spotPin = pin.id;
      el.dataset.status = pin.status;
      el.className = cn(PIN, STATUS_LOOK[pin.status]);
      el.textContent = "P";
      el.setAttribute("aria-label", `${pin.label} — ${statusLabels[pin.status]}`);
      // The map hears clicks on its children too: without this, choosing a pin while
      // placing another spot would drop that spot here.
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        select(pin.id);
      });
      markers.set(pin.id, new maplibre.Marker({ element: el }).setLngLat([pin.lng, pin.lat]).addTo(map));
    }
    if (!fittedRef.current && pins.length > 0) {
      fittedRef.current = true;
      if (pins.length === 1) {
        map.jumpTo({ center: [pins[0]!.lng, pins[0]!.lat] });
      } else {
        const bounds = new maplibre.LngLatBounds();
        for (const pin of pins) bounds.extend([pin.lng, pin.lat]);
        map.fitBounds(bounds, { padding: 64, maxZoom: 16, duration: 0 });
      }
    }
  }, [map, pins, statusLabels, select]);

  // Selection: marked on its pin, and brought into view when it was chosen elsewhere.
  useEffect(() => {
    if (!map) return;
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      const on = id === selectedId;
      el.setAttribute("aria-pressed", String(on));
      for (const name of PIN_SELECTED) el.classList.toggle(name, on);
    });
    const chosen = selectedId ? markersRef.current.get(selectedId) : undefined;
    if (chosen && !map.getBounds().contains(chosen.getLngLat())) map.jumpTo({ center: chosen.getLngLat() });
  }, [map, pins, selectedId]);

  useEffect(() => {
    if (map) map.getCanvas().style.cursor = placingId ? "crosshair" : "";
  }, [map, placingId]);

  const startPlacing = (id: string) => {
    setNotice(null);
    setWriteError(null);
    setPlacingId((current) => (current === id ? null : id));
  };

  const placeAtCentre = () => {
    if (!placing) return;
    const centre = map?.getCenter();
    void place(placing, centre ? { lat: centre.lat, lng: centre.lng } : MAP_CENTRE);
  };

  const selectedNext = selected ? upcomingReservations(reservations.filter((r) => r.spotId === selected.id), now)[0] : undefined;
  const selectedType = selected && SPOT_TYPE_KEY ? selected.values[SPOT_TYPE_KEY] : undefined;

  return (
    <section data-pattern="parking-map" id="parking-map" className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-lg font-medium">{t("mapHeading")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("mapIntro")}</p>
      </div>

      {placing && (
        <div data-placing={placing.id} role="status" className="flex flex-col gap-3 rounded-lg border border-primary bg-card p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>{t("placing", { spot: spotLabel(placing, SPOT_LABEL_KEY) })}</span>
          <span className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" className="h-11" disabled={busy} onClick={placeAtCentre}>{t("placeCentre")}</Button>
            <Button type="button" variant="ghost" className="h-11" onClick={() => setPlacingId(null)}>{t("placeCancel")}</Button>
          </span>
        </div>
      )}

      <div className="relative overflow-hidden rounded-lg border border-border">
        <div ref={containerRef} className="h-[320px] w-full sm:h-[480px]" aria-label={tm("title")} role="application" />
        {!ready && !failed && <Skeleton className="absolute inset-0" />}
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center bg-card p-6 text-center text-sm text-muted-foreground">
            {tm("loadError")}
          </div>
        )}
      </div>

      <ul aria-label={t("legend")} className="flex flex-wrap gap-x-5 gap-y-2">
        {SPOT_STATUSES.map((status) => (
          <li key={status} data-legend={status} className="flex items-center gap-2">
            <StatusBadge status={status} />
            <span className="text-sm text-muted-foreground">{counts[status]}</span>
          </li>
        ))}
      </ul>

      {notice && !placing && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      {writeError && <p role="alert" className="text-sm text-destructive">{writeError}</p>}

      {unplaced.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">{t("unplacedHeading")}</h3>
          <div className="flex flex-wrap gap-2">
            {unplaced.map((spot) => (
              <button
                key={spot.id}
                type="button"
                data-place-spot={spot.id}
                aria-pressed={placingId === spot.id}
                aria-label={t("placeAction", { spot: spotLabel(spot, SPOT_LABEL_KEY) })}
                onClick={() => startPlacing(spot.id)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors motion-reduce:transition-none",
                  placingId === spot.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <MapPin className="size-4" aria-hidden />
                {spotLabel(spot, SPOT_LABEL_KEY)}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div data-selected-spot={selected.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-medium">{spotLabel(selected, SPOT_LABEL_KEY)}</h3>
              {typeof selectedType === "string" && selectedType !== "" && <p className="text-sm text-muted-foreground">{selectedType}</p>}
            </div>
            <StatusBadge status={effectiveStatus(selected, reservations, now)} className="shrink-0" />
          </div>
          <p className="text-sm text-muted-foreground">
            {selectedNext
              ? t("nextReservation", { when: `${dayLabel(selectedNext.date)}, ${selectedNext.from}–${selectedNext.to}` })
              : t("noReservation")}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="h-11" onClick={() => openReservation(selected.id)}>{t("reserve")}</Button>
            <Button type="button" variant="outline" className="h-11" onClick={() => startPlacing(selected.id)}>
              {spotLocation(selected.values) ? t("movePin") : t("placeOnMap")}
            </Button>
          </div>
        </div>
      )}

      {!selected && !loading && spots.length > 0 && pins.length > 0 && <p className="text-sm text-muted-foreground">{t("selectHint")}</p>}
      {!loading && spots.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t("noSpots")}</p>
      )}
    </section>
  );
}
