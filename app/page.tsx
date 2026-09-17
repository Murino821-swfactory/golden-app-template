import { routing } from "@/i18n/routing";

/**
 * SPIKE — the bare root, `/newapp/<slug>/`, sends the visitor to the default locale.
 *
 * `localePrefix: "always"` means no page is generated at the root, and that root is the
 * URL the customer is given. `redirect()` from next/navigation is a server redirect and
 * there is no server, so this is a document that redirects: a meta refresh for anything
 * that reads HTML (crawlers included) and `location.replace` so the browser does not add
 * a history entry the back button would bounce off.
 *
 * The base path is load-bearing. Without it the target is `/en/` at the domain root,
 * which under `tokenwise.sk/newapp/<slug>` is a 404.
 */
const TARGET = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/${routing.defaultLocale}/`;

export default function RootRedirect() {
  return (
    <html lang={routing.defaultLocale}>
      <head>
        <meta httpEquiv="refresh" content={`0; url=${TARGET}`} />
        <link rel="canonical" href={TARGET} />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `location.replace(${JSON.stringify(TARGET)})`,
          }}
        />
        <a href={TARGET}>Continue</a>
      </body>
    </html>
  );
}
