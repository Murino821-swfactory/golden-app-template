"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInbox } from "@/hooks/use-inbox";
import { useOwnerRole } from "@/hooks/use-owner-role";
import { localePath } from "@/lib/locale-routing";
import { inboxView, replyHref } from "@/lib/messages";
import { config } from "@/lib/prototype-config";

function Inbox() {
  const t = useTranslations("inbox");
  const locale = useLocale();
  const { available, resolved, status } = useOwnerRole();
  const view = inboxView({ available, role: resolved ? (status?.role ?? null) : undefined });
  const { messages, loading, error, markRead } = useInbox(view === "ready");

  useEffect(() => {
    if (error) console.error("[inbox] failed to load:", error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
        <Button asChild variant="ghost" className="h-11">
          <Link href={localePath(locale, "/dashboard")}>{t("back")}</Link>
        </Button>
      </header>

      {view === "not-configured" && <p className="text-muted-foreground" role="status">{t("notConfigured")}</p>}
      {view === "forbidden" && <p className="text-muted-foreground" role="status">{t("ownerOnly")}</p>}
      {(view === "checking" || (view === "ready" && loading)) && <Skeleton className="h-24 w-full" />}
      {view === "ready" && error && <p className="text-sm text-destructive" role="alert">{t("loadError")}</p>}
      {view === "ready" && !loading && !error && messages.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      )}

      {view === "ready" && messages.length > 0 && (
        <ul data-inbox-list className="space-y-3">
          {messages.map((m) => (
            <li key={m.id}>
              <details
                className="rounded-lg border border-border bg-card px-4"
                onToggle={(e) => {
                  if ((e.currentTarget as HTMLDetailsElement).open && !m.read) void markRead(m.id);
                }}
              >
                <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 py-3 [&::-webkit-details-marker]:hidden">
                  {!m.read && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">{t("unread")}</span>
                  )}
                  <span className="font-medium">{m.name ?? m.email}</span>
                  <time className="ml-auto text-xs text-muted-foreground" dateTime={m.createdAt.toISOString()}>
                    {m.createdAt.toLocaleString(locale)}
                  </time>
                </summary>
                <div className="space-y-3 pb-4">
                  {m.name && <p className="text-sm text-muted-foreground">{m.email}</p>}
                  <p className="whitespace-pre-wrap text-sm">{m.message}</p>
                  <Button asChild variant="outline" className="h-11">
                    <a href={replyHref(m, config.appName)}>{t("reply")}</a>
                  </Button>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <AuthGuard>
      <Inbox />
    </AuthGuard>
  );
}
