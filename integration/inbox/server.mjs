import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { resolve } from "node:path";

const rules = process.env.FACTORY_FIRESTORE_RULES;
if (!rules) throw new Error("Set FACTORY_FIRESTORE_RULES to factory-web/firestore.rules; never copy rules here.");
await readFile(rules);
const emulator = spawn("java", ["-jar", process.env.FIRESTORE_EMULATOR_JAR || `${homedir()}/.cache/firebase/emulators/cloud-firestore-emulator-v1.19.8.jar`,
  "--host", "127.0.0.1", "--port", "8787", "--project_id", "rules-test", "--rules", resolve(rules)], { stdio: "inherit" });
const stop = () => { emulator.kill("SIGTERM"); process.exit(); };
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
emulator.on("exit", (code) => { if (code) process.exit(code); });

const adapter = resolve("integration/inbox/adapters.tsx");
const bundle = await build({
  entryPoints: ["integration/inbox/entry.tsx"], bundle: true, write: false, format: "esm", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_DEMO_SLUG": '"inbox-regression"', "process.env.NEXT_PUBLIC_BASE_PATH": '""' },
  alias: { "next/link": adapter, "@/components/auth/auth-guard": adapter, "@/hooks/use-owner-role": adapter, "@/lib/firebase": adapter, "@/lib/prototype-config": adapter },
  plugins: [{ name: "write-fault-injection", setup(b) {
    b.onResolve({ filter: /^firebase\/firestore$/ }, (args) => args.importer.endsWith("hooks/use-inbox.ts") ? { path: adapter } : undefined);
  } }],
});
const css = await postcss([tailwind()]).process(await readFile("app/globals.css", "utf8"), { from: resolve("app/globals.css") });
// Do not advertise readiness until the emulator can accept local requests.
for (let attempts = 0; ; attempts++) {
  try { await fetch("http://127.0.0.1:8787/"); break; }
  catch { if (attempts > 100) throw new Error("Firestore emulator did not start"); await new Promise(r => setTimeout(r, 100)); }
}
createServer((req, res) => {
  if (req.url === "/bundle.js") { res.setHeader("Content-Type", "text/javascript"); res.end(bundle.outputFiles[0].contents); }
  else if (req.url === "/styles.css") { res.setHeader("Content-Type", "text/css"); res.end(css.css); }
  else { res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><div id="root"></div><script type="module" src="/bundle.js"></script>'); }
}).listen(3187, "127.0.0.1");
