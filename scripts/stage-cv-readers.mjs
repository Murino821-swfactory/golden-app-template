import { cpSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve("node_modules/pdfjs-dist");
const { version } = JSON.parse(readFileSync(`${source}/package.json`, "utf8"));
const target = resolve("public/cv-readers", version);
mkdirSync(target, { recursive: true });
for (const asset of ["build/pdf.worker.min.mjs", "cmaps", "standard_fonts"]) {
  cpSync(`${source}/${asset}`, `${target}/${asset.split("/").pop()}`, { recursive: true });
}
