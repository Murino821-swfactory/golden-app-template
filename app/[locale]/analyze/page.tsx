import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/recruiting/shell";
import { MatcherView } from "@/components/recruiting/matcher";
import { COPY } from "@/lib/cv-matcher-copy";
import { config } from "@/lib/prototype-config";

// The original public matcher URL (OTH-85, OTH-103, OTH-114) keeps working: it is the
// workspace's matcher page, same component, same browser-only promise. One build ships
// one default locale for the metadata (en).
const copy = COPY.en;

export const metadata: Metadata = {
  title: `${copy.pageTitle} — ${config.appName}`,
  description: copy.pageIntro,
};

export default function AnalyzePage() {
  return (
    <WorkspaceShell>
      <MatcherView />
    </WorkspaceShell>
  );
}
