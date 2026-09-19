import type { Metadata } from "next";
import { PrototypeShell, metadataFor } from "../shell";
import { config } from "@/lib/prototype-config";

/**
 * Root layout for the BARE path — `/`, `/login`, `/dashboard` — which serves the default
 * locale. `lib/locale-routing.ts` records why the default language lives here rather than
 * under `/<locale>` like the others: the customer is given the bare URL, and the harness's
 * publish gate reads `out/index.html` and refuses a build where it is not a real document.
 *
 * The pages here re-export the modules under `app/[locale]/`, so both trees render the same
 * page and only the layout above them differs.
 */

export function generateMetadata(): Metadata {
  return metadataFor(config.defaultLocale);
}

export default function DefaultRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PrototypeShell locale={config.defaultLocale}>{children}</PrototypeShell>;
}
