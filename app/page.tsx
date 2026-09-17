import { config } from "@/lib/prototype-config";

/**
 * The bare root — `tokenwise.sk/newapp/<slug>/` — sends the visitor to the primary language.
 *
 * `localePrefix: "always"` means no page is generated at the root, and that root is exactly
 * the URL the customer is given. `redirect()` from next/navigation is a server redirect and
 * there is no server, so this is a document that redirects: a meta refresh for anything that
 * reads HTML (crawlers included), `location.replace` so the back button does not bounce off
 * a history entry, and a plain link for anyone both of those fail.
 *
 * The base path is load-bearing. Without it the target is `/en/` at the domain root, which
 * under a subdirectory is a 404.
 */
const TARGET = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/${config.defaultLocale}/`;

export default function RootRedirect() {
  return (
    <html lang={config.defaultLocale}>
      <head>
        <meta httpEquiv="refresh" content={`0; url=${TARGET}`} />
        <link rel="canonical" href={TARGET} />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{ __html: `location.replace(${JSON.stringify(TARGET)})` }}
        />
        <a href={TARGET}>{config.appName}</a>
      </body>
    </html>
  );
}
