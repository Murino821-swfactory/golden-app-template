import type { Metadata } from "next";
import type { ReactNode } from "react";
import { config } from "@/lib/prototype-config";
import { landingMetadata, publicUrl } from "@/lib/seo";
import { studioCopy } from "@/lib/studio/copy";

/** The studio is public (it is the product), so it carries real metadata, per language. */
export async function generateMetadata({ params }: { params: Promise<{ locale?: string }> }): Promise<Metadata> {
  const locale = (await params).locale ?? config.defaultLocale;
  const copy = studioCopy(locale);
  const base = landingMetadata(locale);
  const title = `${copy.title} — ${config.appName}`;
  const url = publicUrl(locale, "/studio");
  return {
    ...base,
    title,
    description: copy.intro,
    alternates: {
      canonical: url,
      languages: config.locales.length > 1 ? Object.fromEntries([...config.locales.map((id) => [id, publicUrl(id, "/studio")]), ["x-default", publicUrl(config.defaultLocale, "/studio")]]) : undefined,
    },
    openGraph: { ...base.openGraph, title, description: copy.intro, url },
    twitter: { card: "summary", title, description: copy.intro },
  };
}

export default function StudioLayout({ children }: { children: ReactNode }) {
  return children;
}
