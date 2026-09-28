"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { Research } from "@/components/law-expert/research";

/** law-expert (OTH-91): research over InfoSúd decisions. Signed-in only — the API needs
 * the visitor's ID token, and the daily memo quota is per user. */
export default function ResearchPage() {
  return (
    <AuthGuard>
      <Research />
    </AuthGuard>
  );
}
