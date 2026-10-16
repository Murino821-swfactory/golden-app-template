import { privateMetadata } from "@/lib/seo";
import type { ReactNode } from "react";
export const metadata = privateMetadata;
export default function CreateLayout({ children }: { children: ReactNode }) { return children; }
