import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Rules stay owned by factory-web: point at its files, never copy them here.
const firestoreRules = process.env.FACTORY_FIRESTORE_RULES;
const storageRules = process.env.FACTORY_STORAGE_RULES;
if (!firestoreRules || !storageRules) throw new Error("Set FACTORY_FIRESTORE_RULES and FACTORY_STORAGE_RULES to factory-web's firestore.rules and storage.rules.");
await readFile(firestoreRules);
await readFile(storageRules);
const dir = await mkdtemp(join(tmpdir(), "content-source-"));
await writeFile(join(dir, "firebase.json"), JSON.stringify({
  firestore: { rules: resolve(firestoreRules) },
  storage: { rules: resolve(storageRules) },
  emulators: {
    firestore: { host: "127.0.0.1", port: 8789 }, storage: { host: "127.0.0.1", port: 9189 },
    hub: { host: "127.0.0.1", port: 4489 }, logging: { host: "127.0.0.1", port: 4589 }, ui: { enabled: false },
  },
}));
const emulators = spawn(process.env.FIREBASE_BIN || "firebase", ["emulators:start", "--only", "firestore,storage", "--project", "rules-test", "--config", join(dir, "firebase.json")], { cwd: dir, stdio: "inherit" });
const stop = () => { emulators.kill("SIGINT"); setTimeout(() => process.exit(), 3000); };
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
emulators.on("exit", (code) => { if (code) process.exit(code); });

const adapter = resolve("integration/content-source/adapters.tsx");
process.on("uncaughtException", (error) => { console.error(error); stop(); });
const bundle = await build({
  entryPoints: ["integration/content-source/entry.tsx"], bundle: true, write: false, format: "esm", jsx: "automatic", splitting: false,
  define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_DEMO_SLUG": '"gitpulse-studio"', "process.env.NEXT_PUBLIC_BASE_PATH": '""' },
  alias: { "next/link": adapter, "next/image": resolve("integration/record-focus/image.tsx"), "next/navigation": adapter,
    "@/contexts/auth-context": adapter, "@/lib/firebase": adapter, "@/components/patterns/map-base": adapter },
});
const css = await postcss([tailwind()]).process(await readFile("app/globals.css", "utf8"), { from: resolve("app/globals.css") });
for (const port of [8789, 9189]) {
  for (let attempts = 0; ; attempts++) {
    try { await fetch(`http://127.0.0.1:${port}/`); break; }
    catch { if (attempts > 300) throw new Error(`emulator on ${port} did not start`); await new Promise(r => setTimeout(r, 100)); }
  }
}
createServer(async (req, res) => {
  if (req.url === "/bundle.js") { res.setHeader("Content-Type", "text/javascript"); res.end(bundle.outputFiles[0].contents); }
  else if (req.url === "/styles.css") { res.setHeader("Content-Type", "text/css"); res.end(css.css); }
  else if (/^\/packages\/shared-ui\/fonts\/[a-z-]+\/[a-z0-9-]+\.woff2$/.test(req.url ?? "")) {
    res.setHeader("Content-Type", "font/woff2"); res.end(await readFile(resolve(`.${req.url}`)));
  }
  else { res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html class="dark"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><body class="bg-background text-foreground"><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>'); }
}).listen(3189, "127.0.0.1");
