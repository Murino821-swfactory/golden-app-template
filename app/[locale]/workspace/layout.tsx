import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/realestate/shell";
import { privateMetadata } from "@/lib/seo";

/** The real estate workspace: one shell (sidebar, tab bar, search, persona) around every
 * page under /workspace. Public, no sign-in — the desk lives in the visitor's own browser.
 * Not indexed: the landing is the page search engines should find. */
export const metadata = privateMetadata;

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
