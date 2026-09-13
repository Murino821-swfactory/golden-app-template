"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { Skeleton } from "@/components/ui/skeleton";
import { config } from "@/lib/prototype-config";

/**
 * map-base — an interactive MapLibre map centred where the config says.
 *
 * Deliberately just the base map: container, dark CARTO tiles, zoom/attribution controls.
 * The propcheck original (`PriceMap.tsx`, 14 KB) is a hexagon price choropleth — that is
 * propcheck's analytics, not a generic map, so only the MapLibre shell is portable.
 * A points/routes layer is a later decision [founder 2026-09-12]; until then records live
 * in `data-grid` and the map demonstrates the capability.
 *
 * MapLibre is loaded with a dynamic import inside an effect: it touches `window` at module
 * scope, so a static export (`output: "export"`) fails if it is imported at the top level.
 */

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export function MapBase() {
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
  }, [mapConfig]);

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
