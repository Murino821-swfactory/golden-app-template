import type { MetadataRoute } from "next";
import { config, contentFor } from "@/lib/prototype-config";

/**
 * The web app manifest: what lets a phone put this prototype on the home screen and open
 * it like an app (`display: standalone`), and what iOS 16.4+ requires before a web app may
 * send push notifications. Served at `<basePath>/manifest.webmanifest`; Next links it from
 * every document. Paths carry the base path explicitly — a manifest is fetched by the
 * browser, not routed by Next.
 */
export const dynamic = "force-static";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function manifest(): MetadataRoute.Manifest {
  const copy = contentFor(config);
  return {
    name: config.appName,
    short_name: config.appName,
    description: copy.description,
    start_url: `${BASE}/checkin`,
    scope: `${BASE}/`,
    display: "standalone",
    background_color: "#171717",
    theme_color: "#171717",
    icons: [
      { src: `${BASE}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${BASE}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
      { src: `${BASE}/icons/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
