"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GitpulseCopy } from "@/lib/gitpulse/copy";
import { REPO_PATTERN, SAMPLE_DIGEST, fetchDigest } from "@/lib/gitpulse/github";
import type { Digest } from "@/lib/gitpulse/types";
import { StepCard } from "./ui";

/**
 * Step 1 — where the week comes from: a public repository read live from api.github.com
 * in the visitor's browser, or the bundled sample week when GitHub is unreachable.
 */

type LoadError = "not-found" | "rate-limited" | "network" | "bad-repo" | null;

export function DigestPanel({ digest, onDigest, copy }: {
  digest: Digest | null;
  onDigest: (digest: Digest) => void;
  copy: GitpulseCopy;
}) {
  const [repo, setRepo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LoadError>(null);
  const c = copy.digest;

  async function load() {
    const trimmed = repo.trim();
    if (!REPO_PATTERN.test(trimmed)) {
      setError("bad-repo");
      return;
    }
    setLoading(true);
    setError(null);
    const out = await fetchDigest(trimmed);
    setLoading(false);
    if (out.ok) onDigest(out.digest);
    else setError(out.error);
  }

  return (
    <StepCard title={c.step}>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => { e.preventDefault(); void load(); }}
      >
        <label className="sr-only" htmlFor="gitpulse-repo">{c.repoLabel}</label>
        <Input
          id="gitpulse-repo"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          placeholder={c.repoPlaceholder}
          autoComplete="off"
          className="h-11 flex-1"
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={loading} className="h-11">
            {loading ? c.loading : c.load}
          </Button>
          <Button type="button" variant="outline" className="h-11" onClick={() => { setError(null); onDigest({ ...SAMPLE_DIGEST }); }}>
            {c.sample}
          </Button>
        </div>
      </form>
      {error && <p className="text-sm text-destructive" role="alert">{c.errors[error]}</p>}

      {digest && (
        <div className="space-y-3" data-testid="gitpulse-digest">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{digest.repo}</span> · {c.weekOf} {digest.weekOf}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {([[digest.commits, c.commits], [digest.pullRequests, c.pullRequests], [digest.contributors, c.contributors]] as const).map(([value, label]) => (
              <div key={label} className="rounded-lg border border-border p-3 text-center">
                <div className="text-2xl font-semibold text-primary">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
          {digest.highlights && digest.highlights.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.highlights}</p>
              <ul className="mt-1 space-y-1 text-sm">
                {digest.highlights.map((h) => (
                  <li key={h} className="flex gap-2"><span className="text-primary">→</span><span>{h}</span></li>
                ))}
              </ul>
            </div>
          )}
          {digest.languages && digest.languages.length > 0 && (
            <p className="text-xs text-muted-foreground">{c.languages}: {digest.languages.join(", ")}</p>
          )}
        </div>
      )}
    </StepCard>
  );
}
