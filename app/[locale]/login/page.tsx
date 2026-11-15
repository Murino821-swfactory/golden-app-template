"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { localePath } from "@/lib/locale-routing";
import { clearStartLoginParam, getLoginUrl, isInAppBrowser } from "@/lib/auth-browser";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Notice = "escaping" | "popup-blocked" | "error" | null;

// The user agent never changes during a visit; the static HTML is rendered without one.
const subscribeNever = () => () => {};

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Built-in browsers often lack the async clipboard; the old selection copy still works.
    const input = document.createElement("input");
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, prepareSignIn, signInWithGoogle } = useAuth();
  const t = useTranslations("auth");
  const locale = useLocale();
  const [notice, setNotice] = useState<Notice>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const inApp = useSyncExternalStore(subscribeNever, () => isInAppBrowser(), () => false);
  const dashboard = localePath(locale, "/dashboard");

  // Firebase Auth loads with this page, not with the tap: a browser opens the Google window
  // only inside the tap that asked for it (sw-factory docs/factory/GOOGLE_SIGN_IN.md).
  useEffect(() => {
    clearStartLoginParam();
    void prepareSignIn();
  }, [prepareSignIn]);

  // Back from Google's redirect, or signed in already: nothing left to do on this page.
  useEffect(() => {
    if (!loading && user) router.replace(dashboard);
  }, [loading, user, dashboard, router]);

  const handleSignIn = async () => {
    setNotice(null);
    setIsSubmitting(true);
    try {
      const outcome = await signInWithGoogle();
      if (outcome === "signed-in") router.push(dashboard);
      else if (outcome === "escaping" || outcome === "popup-blocked") setNotice(outcome);
      // "redirecting" leaves the page; "cancelled" leaves it as it was.
    } catch {
      setNotice("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    await copyText(getLoginUrl());
    setCopied(true);
  };

  return (
    // Not `min-h-screen`: the root layout now puts a header above and a footer below, so a
    // full-viewport box here would push the card off-centre and make the page scroll.
    <div className="flex min-h-[calc(100svh-8rem)] flex-col items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>{t("signInTitle")}</CardTitle>
          <CardDescription>{t("signInDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {inApp && (
            <div className="rounded-md border border-border bg-muted p-3 text-sm">
              <p className="font-medium text-foreground">{t("inAppTitle")}</p>
              <p className="mt-1 text-muted-foreground">{t("inAppText")}</p>
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={handleCopy}>
                {copied ? t("inAppCopied") : t("inAppCopy")}
              </Button>
            </div>
          )}
          <Button onClick={handleSignIn} disabled={isSubmitting} className="w-full">
            {t("signInButton")}
          </Button>
          {notice === "escaping" && (
            <p role="status" className="text-sm text-muted-foreground">
              {t("inAppEscaping")}
            </p>
          )}
          {notice === "popup-blocked" && (
            <p role="alert" className="text-sm text-destructive">
              {t("popupBlocked")}
            </p>
          )}
          {notice === "error" && (
            <p role="alert" className="text-sm text-destructive">
              {t("signInError")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
