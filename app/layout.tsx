import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/contexts/auth-context';
import { config } from '@/lib/prototype-config';

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
    <html lang={locale} className={cn("font-sans", geist.variable, "dark")}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>{children}</AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
