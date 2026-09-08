"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithGoogle } = useAuth();
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch {
      setError(t("signInError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>{t("signInTitle")}</CardTitle>
          <CardDescription>{t("signInDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={handleSignIn} disabled={isSubmitting} className="w-full">
            {t("signInButton")}
          </Button>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
