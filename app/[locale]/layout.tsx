import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import '../globals.css';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/contexts/auth-context';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { config, contentFor } from '@/lib/prototype-config';
import { COLOR_SCHEME_IDS, cssBlocksForAll } from '@/lib/color-schemes';

// Applied before the first paint, so a visitor who already picked a palette never sees the
// customer's default flash first. It runs as the first child of <body> — the standard
// blocking-script slot in the App Router, since a static export has no way to inject into
// <head> — and it fails silently: localStorage throws outright in some privacy modes, and
// a colour preference is not worth a blank page.
const SCHEME_BOOTSTRAP = `try{var s=localStorage.getItem('scheme');if(${JSON.stringify(
  COLOR_SCHEME_IDS
)}.indexOf(s)>-1){document.documentElement.dataset.scheme=s}}catch(e){}`;

const geist = Geist({ subsets: ['latin', 'latin-ext'], variable: '--font-sans' });

// Identity comes from prototype.config.json, never from a literal. A hardcoded title is
// what made the smoke gate punish personalization (P3): the moment a prototype named
// itself, `toHaveTitle(/Golden App/)` failed on an otherwise perfect build.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * hreflang only counts as a fully-qualified URL, and this template cannot know where it
 * will be served from — the harness passes the origin at build time. Absent (local dev,
 * the template's own CI), the alternates fall back to paths, which is wrong for a search
 * engine and right for a machine with no domain.
 */
const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN || '';
const urlFor = (locale: string) => `${origin}${basePath}/${locale}/`;

/**
 * Per-locale metadata. The description is copy, so it is written per language; the
 * `alternates` block is what tells a search or generative engine that these URLs are the
 * same page in different languages rather than duplicates competing with each other
 * (golden rules 3 and 4). `x-default` points at the customer's primary language, which is
 * also where the bare root sends anyone.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: config.appName,
    description: contentFor(config, locale).description,
    alternates: {
      canonical: urlFor(locale),
      languages: {
        ...Object.fromEntries(config.locales.map((l) => [l, urlFor(l)])),
        'x-default': urlFor(config.defaultLocale),
      },
    },
  };
}

/** One static page set per language. This is what makes `out/sk.html` exist at all. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Without this the whole subtree opts into dynamic rendering, which `output: "export"`
  // cannot do: the build fails outright rather than quietly shipping one language.
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    // EVERY palette ships as a CSS rule keyed by `data-scheme`, computed at build time by
    // the deterministic rule in lib/color-schemes.ts, so switching one is an attribute
    // write rather than a rebuild. `data-scheme` starts on the palette the customer picked
    // in the wizard — that is what a first-time visitor sees — and the bootstrap script
    // below overrides it only for a visitor who chose differently on this device.
    <html
      lang={locale}
      className={cn("font-sans", geist.variable, "dark")}
      data-scheme={config.theme.colorScheme}
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: SCHEME_BOOTSTRAP }} />
        <style dangerouslySetInnerHTML={{ __html: cssBlocksForAll() }} />
        <NextIntlClientProvider messages={messages}>
          {/* Header and Footer sit here, not in the (public) route group, because the
              header carries the palette switcher and the sign-in control: a page without
              it is a page where the visitor can neither change the palette nor sign out.
              /login and /dashboard were exactly that. */}
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
