"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Info, Map as MapIcon } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import { hexLayerIds, hexLayers, legendBins, stepColorExpression } from "@tokenwise/hex-map";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cultureLabel, landMapCopy } from "@/lib/agro/copy";
import {
  METRIC_IDS,
  METRIC_STOPS,
  MISSING_COLOR,
  binLabel,
  formatMetric,
  parseLandData,
  toFeatures,
  type LandCell,
  type LandData,
  type MetricId,
} from "@/lib/agro/land";

/**
 * Agromapa's land map — this prototype's own section in the `listings` slot (it replaces
 * the template's illustrative offers, whose rents no source backs).
 *
 * Data: `public/data/agro-land.json`, built from BPEJ + LPIS open data by
 * `packages/hex-map/datasets/agro-land`. Two zoom bands: coarse hexagons (H3 res 6) below
 * zoom 8, fine ones (res 7) from it.
 *
 * Like the template's map pattern, nothing loads until the visitor opens the map: tiles come
 * from a third-party CDN and the smoke gate must stay network-clean. The selected hexagon's
 * numbers render in React, never through a MapLibre HTML popup.
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const SWITCH_ZOOM = 8;
const SOURCES = { coarse: "agro-coarse", fine: "agro-fine" } as const;
const SLOVAKIA_BOUNDS: [[number, number], [number, number]] = [[16.83, 47.73], [22.57, 49.62]];

type MapLike = {
  remove: () => void;
  setPaintProperty: (layer: string, prop: string, value: unknown) => void;
  setFeatureState: (target: { source: string; id: number }, state: Record<string, unknown>) => void;
  getLayer: (id: string) => unknown;
};

function LandMap({ data, metric, onSelect }: { data: LandData; metric: MetricId; onSelect: (cell: LandCell) => void }) {
  const t = useTranslations("map");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLike | null>(null);
  const metricRef = useRef(metric);
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [locale] = useState<Record<string, string>>(() => ({
    "Map.Title": t("title"),
    "Popup.Close": t("popupClose"),
    "NavigationControl.ZoomIn": t("zoomIn"),
    "NavigationControl.ZoomOut": t("zoomOut"),
    "NavigationControl.ResetBearing": t("resetBearing"),
    "AttributionControl.ToggleAttribution": t("toggleAttribution"),
    "CooperativeGesturesHandler.MobileHelpText": t("gestureMobile"),
    "CooperativeGesturesHandler.WindowsHelpText": t("gestureWindows"),
    "CooperativeGesturesHandler.MacHelpText": t("gestureMac"),
  }));

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let loaded = false;
    let map: (MapLike & { on: (...args: unknown[]) => void }) | null = null;

    void (async () => {
      try {
        const maplibre = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;
        const coarse = toFeatures(data.coarse, 0);
        const fine = toFeatures(data.fine, coarse.features.length);
        const byId = new Map<number, LandCell>();
        for (const f of [...coarse.features, ...fine.features]) byId.set(f.id, f.properties);

        const instance = new maplibre.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          bounds: SLOVAKIA_BOUNDS,
          fitBoundsOptions: { padding: 16 },
          attributionControl: {
            compact: true,
            customAttribution: "BPEJ © NPPC-VÚPOP (CC0) · LPIS 2026 © PPA (CC BY 4.0)",
          },
          cooperativeGestures: true,
          locale,
        });
        instance.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");

        let selected: { source: string; id: number } | null = null;
        instance.on("load", () => {
          loaded = true;
          if (cancelled) return;
          const fill = stepColorExpression(metricRef.current, METRIC_STOPS[metricRef.current], MISSING_COLOR);
          instance.addSource(SOURCES.coarse, { type: "geojson", data: coarse as never });
          instance.addSource(SOURCES.fine, { type: "geojson", data: fine as never });
          for (const spec of [
            ...hexLayers(SOURCES.coarse, { fillColor: fill, maxzoom: SWITCH_ZOOM }),
            ...hexLayers(SOURCES.fine, { fillColor: fill, minzoom: SWITCH_ZOOM }),
          ]) {
            instance.addLayer(spec as never);
          }
          for (const source of Object.values(SOURCES)) {
            const fillLayer = hexLayerIds(source).fill;
            instance.on("click", fillLayer, (e) => {
              const feature = e.features?.[0];
              if (!feature || typeof feature.id !== "number") return;
              const cell = byId.get(feature.id);
              if (!cell) return;
              if (selected) instance.setFeatureState(selected, { selected: false });
              selected = { source, id: feature.id };
              instance.setFeatureState(selected, { selected: true });
              onSelectRef.current(cell);
            });
            instance.on("mouseenter", fillLayer, () => (instance.getCanvas().style.cursor = "pointer"));
            instance.on("mouseleave", fillLayer, () => (instance.getCanvas().style.cursor = ""));
          }
          setReady(true);
        });
        instance.on("error", (e) => {
          if (loaded || cancelled) return;
          console.error("[land-map] the map style failed to load:", e.error);
          setFailed(true);
        });
        map = instance as unknown as typeof map;
        mapRef.current = map;
      } catch (err) {
        console.error("[land-map] failed to initialise MapLibre:", err);
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current = null;
      map?.remove();
    };
  }, [data, locale]);

  // A layer switch repaints the fill; it never rebuilds the map.
  useEffect(() => {
    metricRef.current = metric;
    const map = mapRef.current;
    if (!map || !ready) return;
    const fill = stepColorExpression(metric, METRIC_STOPS[metric], MISSING_COLOR);
    for (const source of Object.values(SOURCES)) {
      const id = hexLayerIds(source).fill;
      if (map.getLayer(id)) map.setPaintProperty(id, "fill-color", fill);
    }
  }, [metric, ready]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-border">
      <div ref={containerRef} className="h-[420px] w-full sm:h-[560px]" aria-label={t("title")} role="application" />
      {!ready && !failed && <Skeleton className="absolute inset-0" />}
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-card p-6 text-center text-sm text-muted-foreground">
          {t("loadError")}
        </div>
      )}
    </div>
  );
}

function Legend({ metric }: { metric: MetricId }) {
  const locale = useLocale();
  const copy = landMapCopy(locale);
  const bins = legendBins(METRIC_STOPS[metric]);
  return (
    <div data-land-legend className="flex flex-col gap-2 text-xs text-muted-foreground">
      <p>{copy.metrics[metric].legend}</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {bins.map((bin) => (
          <li key={bin.from} className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block size-3 shrink-0 rounded-sm" style={{ backgroundColor: bin.color }} />
            <span className="tabular-nums">{binLabel(metric, bin.from, bin.to, locale)}</span>
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-3 shrink-0 rounded-sm border border-border" style={{ backgroundColor: MISSING_COLOR }} />
          <span>{copy.noData}</span>
        </li>
      </ul>
    </div>
  );
}

function CellDetail({ cell }: { cell: LandCell | null }) {
  const locale = useLocale();
  const copy = landMapCopy(locale);
  if (!cell) return <p className="text-sm text-muted-foreground">{copy.pickHint}</p>;
  return (
    <dl data-land-detail className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
      <div className="col-span-2 sm:col-span-4">
        <dt className="text-muted-foreground">{copy.detail.locality}</dt>
        <dd className="text-lg font-semibold">{cell.locality ?? "–"}</dd>
      </div>
      {METRIC_IDS.map((metric) => (
        <div key={metric}>
          <dt className="text-muted-foreground">{copy.metrics[metric].label}</dt>
          <dd className="font-medium tabular-nums">{formatMetric(metric, cell[metric], locale)}</dd>
        </div>
      ))}
      <div>
        <dt className="text-muted-foreground">{copy.detail.group}</dt>
        <dd className="font-medium tabular-nums">
          {cell.group ?? "–"} <span className="text-xs font-normal text-muted-foreground">({copy.detail.groupHint})</span>
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{copy.detail.culture}</dt>
        <dd className="font-medium">{cultureLabel(copy, cell.culture)}</dd>
      </div>
      <div className="col-span-2">
        <dt className="text-muted-foreground">{copy.detail.cell}</dt>
        <dd className="font-mono text-xs">{cell.cell}</dd>
      </div>
    </dl>
  );
}

export function LandMapSection() {
  const locale = useLocale();
  const copy = useMemo(() => landMapCopy(locale), [locale]);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<LandData | null>(null);
  const [error, setError] = useState(false);
  const [metric, setMetric] = useState<MetricId>("bh");
  const [selected, setSelected] = useState<LandCell | null>(null);

  useEffect(() => {
    if (!open || data) return;
    let cancelled = false;
    fetch(`${BASE_PATH}/data/agro-land.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((raw: unknown) => {
        if (!cancelled) setData(parseLandData(raw));
      })
      .catch((err: unknown) => {
        console.error("[land-map] agro-land.json failed to load:", err);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, data]);

  return (
    <section id="map" data-section="listings" data-land-map className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
      <h2 className="text-balance text-center text-3xl font-semibold tracking-tight">{copy.heading}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">{copy.intro}</p>
      <p className="mx-auto mt-4 flex max-w-2xl items-start justify-center gap-2 text-center text-xs text-muted-foreground">
        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        {copy.notice}
      </p>

      <div role="group" aria-label={copy.layerLabel} className="mt-8 flex flex-wrap justify-center gap-2">
        {METRIC_IDS.map((id) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={metric === id ? "default" : "outline"}
            aria-pressed={metric === id}
            className="h-11 sm:h-9"
            onClick={() => setMetric(id)}
          >
            {copy.metrics[id].label}
          </Button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {!open ? (
          <div className="flex h-[240px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card">
            <Button type="button" size="lg" className="h-12" onClick={() => setOpen(true)}>
              <MapIcon aria-hidden className="size-4" />
              {copy.openMap}
            </Button>
          </div>
        ) : error ? (
          <div className="flex h-[240px] items-center justify-center rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {copy.loadError}
          </div>
        ) : !data ? (
          <div className="relative h-[420px] sm:h-[560px]">
            <Skeleton className="absolute inset-0" />
            <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">{copy.loading}</p>
          </div>
        ) : (
          <LandMap data={data} metric={metric} onSelect={setSelected} />
        )}

        <Legend metric={metric} />
        {open && data && (
          <div className="rounded-lg border border-border bg-card p-4">
            <CellDetail cell={selected} />
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        {copy.sourcesLabel}:{" "}
        <a className="underline underline-offset-2" href="https://data.slovensko.sk/datasety/46120bf5-30e4-4031-b471-6d5d1f4dfaba" target="_blank" rel="noopener noreferrer">
          BPEJ, NPPC-VÚPOP (CC0 1.0)
        </a>
        {" · "}
        <a className="underline underline-offset-2" href="https://data.slovensko.sk/datasety/4c408849-80e9-41a2-8c93-08a65b7ce4fb" target="_blank" rel="noopener noreferrer">
          LPIS 2026, PPA (CC BY 4.0)
        </a>
        {data ? ` · ${data.generated}` : ""}
      </p>
    </section>
  );
}
