import assert from "node:assert/strict";
import { test } from "node:test";
import { publishProof, testedBase } from "./ci-proof.mjs";
const proof = { head: "a".repeat(40), base: "b".repeat(40), merge: "c".repeat(40), state: "success", run: "20", attempt: "1" };
function service(old) {
  const calls = [];
  const api = async (path, method = "GET", body) => {
    calls.push({ path, method, body });
    if (path.startsWith("git/ref/")) return old ? { object: { sha: "previous" } } : null;
    if (path === "git/commits/previous") return { message: "CI verification\n" + JSON.stringify(old) };
    if (path === `git/commits/${proof.merge}`) return { tree: { sha: "tree" } };
    if (path === "git/commits" && method === "POST") return { sha: "record" };
    return {};
  };
  return { api, calls };
}
test("verification records leave application files intact and update only their own ref", async () => {
  const { api, calls } = service(); await publishProof(proof, 7, api);
  const commit = calls.find(c => c.path === "git/commits");
  assert.equal(commit.body.tree, "tree"); assert.deepEqual(commit.body.parents, [proof.merge]);
  assert.deepEqual(calls.at(-1).body, { ref: "refs/ci/verified/pr-7", sha: "record" });
});
test("newer runs and reruns cannot be overwritten by an obsolete writer", async () => {
  for (const old of [{ ...proof, run: "21" }, { ...proof, attempt: "2" }]) {
    const { api, calls } = service(old); await publishProof(proof, 7, api);
    assert.equal(calls.some(c => c.method !== "GET"), false);
  }
});
test("a failed result invalidates previous success using a fast-forward-only update", async () => {
  const { api, calls } = service({ ...proof, run: "19" });
  await publishProof({ ...proof, state: "failed" }, 7, api);
  assert.equal(JSON.parse(calls.find(c => c.path === "git/commits").body.message.slice("CI verification\n".length)).state, "failed");
  assert.deepEqual(calls.find(c => c.path === "git/commits").body.parents, [proof.merge, "previous"]);
  assert.deepEqual(calls.at(-1).body, { sha: "record", force: false });
});
test("a conflicting reference write retries instead of forcing over another run", async () => {
  const { api } = service(); let writes = 0;
  await publishProof(proof, 7, async (path, method, body) => {
    if (path === "git/refs" && ++writes === 1) { const e = new Error("conflict"); e.status = 422; throw e; }
    return api(path, method, body);
  });
  assert.equal(writes, 2);
});

test("proof uses the actual tested base despite stale PR metadata and rejects another head", () => {
  const head = "a".repeat(40), base = "b".repeat(40), merge = "c".repeat(40);
  const event = { pull_request: { head: { sha: head }, base: { sha: "d".repeat(40) } } };
  assert.equal(testedBase(event, merge, merge, [base, head]), base);
  assert.throws(() => testedBase(event, merge, head, [base, head]), /checkout/);
  assert.throws(() => testedBase(event, merge, merge, [base, base]), /merge tree/);
  assert.throws(() => testedBase(event, merge, merge, [base]), /merge tree/);
});
