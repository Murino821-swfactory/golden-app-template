"use client";

import { useLocale } from "next-intl";
import { AuthGuard } from "@/components/auth/auth-guard";
import { GitpulseStudio } from "@/components/gitpulse/studio";
import { OwnerLinks } from "@/components/owner/owner-links";
import { gitpulseCopy } from "@/lib/gitpulse/copy";

/**
 * The creation studio — GitPulse Studio's generation layer (branch-specific code, like the
 * cv-matcher workspace). Signed-in only: every generate call spends the server-side quota
 * under the visitor's own Firebase ID token.
 */
function CreateContent() {
  const copy = gitpulseCopy(useLocale());
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">{copy.page.title}</h1>
        <p className="mt-2 text-muted-foreground">{copy.page.intro}</p>
      </header>
      <OwnerLinks />
      <GitpulseStudio />
    </div>
  );
}

export default function CreatePage() {
  return (
    <AuthGuard>
      <CreateContent />
    </AuthGuard>
  );
}
