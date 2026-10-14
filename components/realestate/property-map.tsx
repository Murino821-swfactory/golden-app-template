"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { PropertyPoint } from "@/lib/realestate/geo";

/**
 * property-map — the workspace's own interactive map, the same MapLibre shell the template's
 * dashboard carries (`components/patterns/map-base`), but fed by the properties on screen
 * instead of the config's `listings`. It pins every current listing that has a known place
 * (see `lib/realestate/geo.ts`) and a click on a pin opens that listing.
 *
 * MapLibre touches `window` at module scope, so it is dynamically imported inside the effect:
 * a static export (`output: "export"`) fails if it is imported at the top level. Phones get
 * `cooperativeGestures` — one finger scrolls the page, two move the map — and every MapLibre
 * string comes from the `map` block of `messages/*.json`, so nothing is English on a Slovak
 * page. A style that never loads ends in the error message instead of an endless skeleton.
 */

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
// Bratislava — the agency's home city; the fallback when nothing is pinned yet.
const DEFAULT_CENTER: [number, number] = [17.1077, 48.1486];
const DEFAULT_ZOOM = 10;

export function PropertyMap({ points, onSelect }: { points: readonly PropertyPoint[]; onSelect?: (id: string) => void }) {
  const t = useTranslations("map");
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Kept in a ref so a new `onSelect` (it changes with the URL) never rebuilds the map.
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
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

  useEffect(() => {
    if (!containerRef.current) return;

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
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          attributionControl: { compact: true },
          cooperativeGestures: true,
          locale,
        });
        instance.addControl(new maplibre.NavigationControl(), "top-right");
        // The pin takes the palette's accent, so "Change colour" is the only thing that sets it.
        const accent = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || undefined;
        for (const point of points) {
          const marker = new maplibre.Marker({ color: accent })
            .setLngLat([point.lng, point.lat])
            .setPopup(new maplibre.Popup({ offset: 24 }).setText(point.label))
            .addTo(instance);
          if (onSelectRef.current) {
            const el = marker.getElement();
            el.style.cursor = "pointer";
            el.addEventListener("click", () => onSelectRef.current?.(point.id));
          }
        }
        if (points.length > 0) {
          const bounds = new maplibre.LngLatBounds();
          for (const point of points) bounds.extend([point.lng, point.lat]);
          instance.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 0 });
        }
        instance.on("load", () => {
          loaded = true;
          if (!cancelled) setReady(true);
        });
        // After `load`, an error is one tile; before it, the map has nothing to draw.
        instance.on("error", (e) => {
          if (loaded || cancelled) return;
          console.error("[property-map] the map style failed to load:", e.error);
          setFailed(true);
        });
        map = instance;
      } catch (err) {
        console.error("[property-map] failed to initialise MapLibre:", err);
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points, locale]);

  return (
    <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div
        ref={containerRef}
        className="h-[300px] w-full sm:h-[380px]"
        aria-label={t("title")}
        role="application"
      />
      {!ready && !failed && (
        // pointer-events-none: the pins are placed before the tiles arrive, so a click must
        // still reach them while this placeholder is up.
        <div className="pointer-events-none absolute inset-0 animate-pulse bg-muted/40" />
      )}
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-card p-6 text-center text-sm text-muted-foreground">
          {t("loadError")}
        </div>
      )}
    </div>
  );
}
