import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// App-readable CI state uses Contents access, not Actions/Checks permissions.
// Fast-forward updates serialize concurrent writers; newer runs cannot be overwritten.
export async function publishProof(proof, number, api) {
  const ref = `ci/verified/pr-${number}`;
  for (let retry = 0; retry < 4; retry++) {
    const current = await api(`git/ref/${ref}`);
    if (current) {
      const previous = await api(`git/commits/${current.object.sha}`);
      if (!previous.message.startsWith("CI verification\n")) throw new Error("Invalid previous CI record");
      const old = JSON.parse(previous.message.slice("CI verification\n".length));
      if (BigInt(old.run) > BigInt(proof.run) || (old.run === proof.run && Number(old.attempt) > Number(proof.attempt))) return;
    }
    const source = await api(`git/commits/${proof.merge}`);
    const record = await api("git/commits", "POST", {
      message: "CI verification\n" + JSON.stringify(proof), tree: source.tree.sha,
      parents: [proof.merge, ...(current ? [current.object.sha] : [])],
    });
    try {
      if (current) await api(`git/refs/${ref}`, "PATCH", { sha: record.sha, force: false });
      else await api("git/refs", "POST", { ref: `refs/${ref}`, sha: record.sha });
      return;
    } catch (error) {
      if (![409, 422].includes(error.status)) throw error;
    }
  }
  throw new Error("Concurrent CI state update did not settle");
}

export function testedBase(event, merge, checked, parents) {
  const head = event.pull_request?.head.sha ?? merge;
  if (![merge, head].every(sha => /^[a-f0-9]{40}$/.test(sha ?? "")) || checked !== merge)
    throw new Error("CI checkout does not match the workflow commit");
  if (!event.pull_request) return merge;
  // GitHub's event/API base.sha can lag behind the actual target branch.
  // The tested merge's first parent is the base whose code really ran.
  if (parents.length !== 2 || parents[1] !== head || !/^[a-f0-9]{40}$/.test(parents[0]))
    throw new Error("CI checkout must be the tested base/head merge tree");
  return parents[0];
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const merge = process.env.GITHUB_SHA;
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const head = event.pull_request?.head.sha ?? merge;
  const checked = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const parents = event.pull_request
    ? execFileSync("git", ["show", "-s", "--format=%P", "HEAD"], { encoding: "utf8" }).trim().split(" ")
    : [];
  const base = testedBase(event, merge, checked, parents);
  const state = process.env.CI_PROOF_STATE ?? "success";
  const proof = { head, base, merge, state, run: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT ?? "1" };
  if (!["pending", "success", "failed"].includes(state)) throw new Error("Invalid CI verification state");
  mkdirSync(".ci", { recursive: true });
  writeFileSync(".ci/ci-verification.json", JSON.stringify(proof) + "\n");
  if (process.env.CI_PROOF_PUBLISH !== "false" && event.pull_request && event.pull_request.head.repo.full_name.toLowerCase() === process.env.GITHUB_REPOSITORY.toLowerCase()) {
    if (!process.env.GH_TOKEN) throw new Error("CI verification needs the workflow repository token");
    const api = async (path, method = "GET", body) => {
      const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/${path}`, {
        method, headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30_000),
      });
      if (method === "GET" && response.status === 404) return null;
      if (!response.ok) { const error = new Error(`CI verification API: HTTP ${response.status}`); error.status = response.status; throw error; }
      return response.json();
    };
    await publishProof(proof, event.pull_request.number, api);
  }
}
