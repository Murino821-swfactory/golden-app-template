import { privateMetadata } from "@/lib/seo";
import type { ReactNode } from "react";
export const metadata = privateMetadata;
export default function PrivateLayout({ children }: { children: ReactNode }) { return children; }
