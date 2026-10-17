import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/**
 * When deploying as a subdirectory of tokenwise.sk (e.g. /demo/golden),
 * set NEXT_PUBLIC_BASE_PATH=/demo/golden before build.
 * For standalone hosting (*.web.app), leave it unset.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  images: {
    unoptimized: true,
  },
  // Workspace packages ship as TypeScript source, not a build (packages/shared-ui, packages/hex-map).
  transpilePackages: ["@tokenwise/shared-ui", "@tokenwise/hex-map"],
};

export default withNextIntl(nextConfig);
