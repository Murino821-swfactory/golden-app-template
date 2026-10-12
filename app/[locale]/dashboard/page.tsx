"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { AuthGuard } from "@/components/auth/auth-guard";
import { OwnerLinks } from "@/components/owner/owner-links";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/hooks/use-workspace";
import { localePath } from "@/lib/locale-routing";

/**
 * The signed-in page of this prototype is the workspace (public, browser-local). Signing
 * in still has a home — the header's "Dashboard" lands here — but the desk itself is one
 * place for everyone, so this page sends the visitor on and keeps the owner's shortcuts.
 */
function DashboardContent() {
  const c = useCopy();
  const locale = useLocale();
  const router = useRouter();
  const href = localePath(locale, "/workspace");
  useEffect(() => {
    router.replace(href);
  }, [router, href]);
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">{c.redirect.title}</h1>
        <p className="mt-2 text-muted-foreground">{c.redirect.text}</p>
      </header>
      <OwnerLinks />
      <Button asChild className="h-11">
        <Link href={href}>{c.redirect.open}</Link>
      </Button>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
