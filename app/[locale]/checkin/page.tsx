import type { Metadata, Viewport } from "next";
import { DailyCheckin } from "@/components/features/daily-checkin";
import { COPY } from "@/lib/checkin-copy";
import { config } from "@/lib/prototype-config";
import { publicUrl } from "@/lib/seo";

// Public on purpose: the log lives in the visitor's browser (and, signed in, in their own
// sandbox), so there is nothing to sign in for. One build ships one locale (en).
const copy = COPY.en;
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const url = publicUrl(config.defaultLocale, "/checkin");

/**
 * This page is a product page of its own — a campaign may land visitors here directly — so
 * it carries its own canonical and share metadata instead of inheriting the landing's,
 * plus what a phone needs to pin it to the home screen (manifest in `app/manifest.ts`).
 */
export const metadata: Metadata = {
  title: `${copy.pageTitle} — ${config.appName}`,
  description: copy.pageIntro,
  alternates: { canonical: url },
  openGraph: { type: "website", siteName: config.appName, title: `${copy.pageTitle} — ${config.appName}`, description: copy.pageIntro, url },
  icons: { apple: `${BASE}/icons/apple-touch-icon.png` },
  appleWebApp: { capable: true, title: config.appName, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#171717" };

export default function CheckinPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="max-w-2xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{copy.pageTitle}</h1>
        <p className="text-muted-foreground sm:text-lg">{copy.pageIntro}</p>
      </header>
      <DailyCheckin />
    </div>
  );
}
