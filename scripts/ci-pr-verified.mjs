import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * A push to main whose tree is byte-identical to a tree its pull request already
 * passed needs no second test run (LSS, 2026-10-10). The evidence is the PR's
 * `ci/verified/pr-N` record: its commit carries the tested merge tree.
 */
export function pullRequestNumbers(message) {
  const subject = String(message ?? "").split("\n", 1)[0];
  const numbers = new Set();
  const merge = /^Merge pull request #(\d+) /.exec(subject);
  if (merge) numbers.add(Number(merge[1]));
  const squash = /\(#(\d+)\)\s*$/.exec(subject);
  if (squash) numbers.add(Number(squash[1]));
  return [...numbers];
}

export function treeVerified(record, headTree) {
  if (!record || !/^[a-f0-9]{40}$/.test(headTree ?? "")) return false;
  if (!String(record.message).startsWith("CI verification\n")) return false;
  try {
    const proof = JSON.parse(record.message.slice("CI verification\n".length));
    return proof.state === "success" && record.tree === headTree;
  } catch {
    return false;
  }
}

async function main() {
  const git = args => execFileSync("git", args, { encoding: "utf8" }).trim();
  const api = async path => {
    const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/${path}`, {
      headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  };
  let verified = false;
  try {
    const headTree = git(["rev-parse", "HEAD^{tree}"]);
    for (const number of pullRequestNumbers(git(["show", "-s", "--format=%B", "HEAD"]))) {
      const ref = await api(`git/ref/ci/verified/pr-${number}`);
      const commit = await api(`git/commits/${ref.object.sha}`);
      if (treeVerified({ message: commit.message, tree: commit.tree.sha }, headTree)) { verified = true; break; }
    }
  } catch (error) {
    // Missing or unreadable evidence keeps the ordinary test run.
    console.log(`No reusable PR verification: ${error instanceof Error ? error.message : error}`);
  }
  console.log(`PR-verified tree: ${verified}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `verified=${verified}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) await main();
