"use client";

import { useEffect, useRef, useState } from "react";
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
 */

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export function MapBase({ points = [] }: { points?: readonly MapPoint[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const mapConfig = config.patterns.mapBase;

  useEffect(() => {
    if (!mapConfig || !containerRef.current) return;

    let map: { remove: () => void } | null = null;
    let cancelled = false;

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
          if (!cancelled) setReady(true);
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
  }, [mapConfig, points]);

  if (!mapConfig) return null;

  return (
    <section data-pattern="map-base" className="space-y-3">
      <div className="relative overflow-hidden rounded-lg border border-border">
        <div
          ref={containerRef}
          className="h-[320px] w-full sm:h-[480px]"
          aria-label="Interactive map"
          role="application"
        />
        {!ready && !failed && (
          <Skeleton className="absolute inset-0" />
        )}
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
            The map could not be loaded.
          </div>
        )}
      </div>
    </section>
  );
}
