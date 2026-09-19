"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { localePath } from "@/lib/locale-routing";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  // Sign-in exists once per language; bouncing a Slovak visitor to the default locale's
  // /login would silently change the language of the session they came from.
  const locale = useLocale();

  useEffect(() => {
    if (!loading && !user) {
      router.push(localePath(locale, "/login"));
    }
  }, [user, loading, locale, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
