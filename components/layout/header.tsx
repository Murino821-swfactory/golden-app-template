"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { config } from "@/lib/prototype-config";

export function Header() {
  const t = useTranslations("common");
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-heading text-sm font-semibold">
          {config.appName}
        </Link>
        <Button asChild size="sm" variant={user ? "outline" : "default"}>
          <Link href={user ? "/dashboard" : "/login"}>
            {loading ? t("loading") : user ? t("dashboard") : t("signIn")}
          </Link>
        </Button>
      </div>
    </header>
  );
}
