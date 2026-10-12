import type { MetadataRoute } from "next";
import { config } from "@/lib/prototype-config";
import { localeHref } from "@/lib/locale-routing";
import { publicUrl, siteOrigin } from "@/lib/seo";

export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: config.locales.flatMap((locale) =>
      ["/login", "/dashboard", "/messages"].map((route) => localeHref(locale, route))) },
    ...(siteOrigin() ? { sitemap: publicUrl(config.defaultLocale, "/sitemap.xml") } : {}),
  };
}
