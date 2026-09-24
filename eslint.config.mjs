import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // `npm run preview` stages the export here for basePath serving. It is gitignored, so
    // CI never sees it — but locally it made `npm run lint` report ~9k problems in minified
    // chunks, which is the same as having no lint at all.
    ".preview/**",
  ]),
]);

export default eslintConfig;
