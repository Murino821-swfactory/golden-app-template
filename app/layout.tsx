import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/contexts/auth-context';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { config } from '@/lib/prototype-config';
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
export const metadata: Metadata = {
  title: config.appName,
  description: config.description,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
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
