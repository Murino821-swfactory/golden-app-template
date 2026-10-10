"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Skeleton } from "@/components/ui/skeleton";
import { config } from "@/lib/prototype-config";
import type { MapPoint } from "@/lib/listings";

/**
 * map-base — an interactive MapLibre map centred where the config says.
 *
 * Deliberately just the base map: container, dark CARTO tiles, zoom/attribution controls.
 * The propcheck original (`PriceMap.tsx`, 14 KB) is a hexagon price choropleth — that is
 * propcheck's analytics, not a generic map, so only the MapLibre shell is portable.
 * Points (2026-10-09): the offers of the `listings` pattern that carry a location are
 * pinned on it, and the view fits them. A marker's popup is set with `setText`, never HTML —
 * its title is model-written copy.
 *
 * MapLibre is loaded with a dynamic import inside an effect: it touches `window` at module
 * scope, so a static export (`output: "export"`) fails if it is imported at the top level.
 *
 * Phones (2026-10-10): `cooperativeGestures` — one finger scrolls the page past the map,
 * two fingers move it; without it a finger landing on the map trapped the page scroll.
 * MapLibre's own strings (controls, markers, that hint) come from the `map` block of
 * `messages/*.json` through its `locale` option, so nothing on the map is English on a
 * Slovak page. A style that never loads (CARTO down, no network) fires `error` before
 * `load`; it ends in the message instead of an endless skeleton.
 */

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export function MapBase({ points = [] }: { points?: readonly MapPoint[] }) {
  const t = useTranslations("map");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  // Read once: a language switch is a new document, and a new object here would rebuild the map.
  const [locale] = useState<Record<string, string>>(() => ({
    "Map.Title": t("title"),
    "Marker.Title": t("marker"),
    "Popup.Close": t("popupClose"),
    "NavigationControl.ZoomIn": t("zoomIn"),
    "NavigationControl.ZoomOut": t("zoomOut"),
    "NavigationControl.ResetBearing": t("resetBearing"),
    "AttributionControl.ToggleAttribution": t("toggleAttribution"),
    "CooperativeGesturesHandler.MobileHelpText": t("gestureMobile"),
    "CooperativeGesturesHandler.WindowsHelpText": t("gestureWindows"),
    "CooperativeGesturesHandler.MacHelpText": t("gestureMac"),
  }));

  const mapConfig = config.patterns.mapBase;

  useEffect(() => {
    if (!mapConfig || !containerRef.current) return;

    let map: { remove: () => void } | null = null;
    let cancelled = false;
    let loaded = false;

    void (async () => {
      try {
        const maplibre = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;

        const instance = new maplibre.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center: [mapConfig.center.lng, mapConfig.center.lat],
          zoom: mapConfig.zoom,
          attributionControl: { compact: true },
          cooperativeGestures: true,
          locale,
        });
        instance.addControl(new maplibre.NavigationControl(), "top-right");
        // The pin takes the palette's accent, so "Change colour" is the only thing that sets it.
        const accent = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || undefined;
        for (const point of points) {
          new maplibre.Marker({ color: accent })
            .setLngLat([point.lng, point.lat])
            .setPopup(new maplibre.Popup({ offset: 24 }).setText(point.label))
            .addTo(instance);
        }
        if (points.length > 1) {
          const bounds = new maplibre.LngLatBounds();
          for (const point of points) bounds.extend([point.lng, point.lat]);
          instance.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 });
        }
        instance.on("load", () => {
          loaded = true;
          if (!cancelled) setReady(true);
        });
        // After `load`, an error is one tile; before it, the map has nothing to draw.
        instance.on("error", (e) => {
          if (loaded || cancelled) return;
          console.error("[map-base] the map style failed to load:", e.error);
          setFailed(true);
        });
        map = instance;
      } catch (err) {
        console.error("[map-base] failed to initialise MapLibre:", err);
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [mapConfig, points, locale]);

  if (!mapConfig) return null;

  return (
    <section data-pattern="map-base" className="space-y-3">
      <div className="relative overflow-hidden rounded-lg border border-border">
        <div
          ref={containerRef}
          className="h-[320px] w-full sm:h-[480px]"
          aria-label={t("title")}
          role="application"
        />
        {!ready && !failed && (
          <Skeleton className="absolute inset-0" />
        )}
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center bg-card p-6 text-center text-sm text-muted-foreground">
            {t("loadError")}
          </div>
        )}
      </div>
    </section>
  );
}
