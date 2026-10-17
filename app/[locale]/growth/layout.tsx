import type { Metadata } from "next";
import type { ReactNode } from "react";
import { growthCopy } from "@/lib/growth/copy";
import { config } from "@/lib/prototype-config";
import { landingMetadata, publicUrl } from "@/lib/seo";

/** The growth plan is public (it is part of the product), so it carries real metadata, per language. */
export async function generateMetadata({ params }: { params: Promise<{ locale?: string }> }): Promise<Metadata> {
  const locale = (await params).locale ?? config.defaultLocale;
  const copy = growthCopy(locale);
  const base = landingMetadata(locale);
  const title = `${copy.title} — ${config.appName}`;
  const url = publicUrl(locale, "/growth");
  return {
    ...base,
    title,
    description: copy.intro,
    alternates: {
      canonical: url,
      languages: config.locales.length > 1 ? Object.fromEntries([...config.locales.map((id) => [id, publicUrl(id, "/growth")]), ["x-default", publicUrl(config.defaultLocale, "/growth")]]) : undefined,
    },
    openGraph: { ...base.openGraph, title, description: copy.intro, url },
    twitter: { card: "summary", title, description: copy.intro },
  };
}

export default function GrowthLayout({ children }: { children: ReactNode }) {
  return children;
}
