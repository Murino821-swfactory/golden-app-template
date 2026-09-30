// Test-only server: no route, fake auth switch or fake store is shipped in the Next export.
import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
const dir = await mkdtemp(path.join(tmpdir(), "law-expert-ui-"));
await build({ entryPoints: ["tests/law-expert-fixtures/harness.tsx"], bundle: true, outfile: path.join(dir, "app.js"), platform: "browser", jsx: "automatic", define: { "process.env": JSON.stringify({ NODE_ENV: "test" }) }, alias: { "next/link": path.resolve("tests/law-expert-fixtures/link.tsx") }, logLevel: "warning" });
const chunks = "out/_next/static/chunks";
const css = (await Promise.all((await readdir(chunks)).filter(n => n.endsWith(".css")).map(n => readFile(path.join(chunks, n), "utf8")))).join("\n");
const server = createServer(async (req, res) => {
  if (req.url === "/app.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(await readFile(path.join(dir, "app.js"))); }
  if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); return res.end(css); }
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><html class="dark" lang="sk"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><body><div id="root"></div><script src="/app.js"></script></body></html>');
});
server.listen(3107, "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { server.close(); void rm(dir, { recursive: true, force: true }).then(() => process.exit()); });
