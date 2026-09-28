"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRecords } from "@/hooks/use-records";
import { localePath } from "@/lib/locale-routing";
import type { ResearchCopy } from "@/lib/law-expert/copy";
import type { MemoResponse } from "@/lib/law-expert/types";
import { caseRecordValues } from "@/lib/law-expert/view";

/**
 * Save a memo as a record of the prototype's own `case` entity — the "My cases" list on the
 * dashboard. Only now does anything the visitor typed reach storage, and only the
 * qualification and sources, never the facts text.
 */
export function SaveCase({ memo, copy, locale }: { memo: MemoResponse; copy: ResearchCopy; locale: string }) {
  const { addRecord } = useRecords();
  const [open, setOpen] = useState(false);
  const [caseNumber, setCaseNumber] = useState("");
  const [courtName, setCourtName] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  if (!open) {
    return (
      <Button variant="outline" className="h-11 w-full sm:w-auto" onClick={() => setOpen(true)}>
        {copy.save.open}
      </Button>
    );
  }

  if (state === "saved") {
    return (
      <p role="status" className="rounded-lg border border-border bg-card p-4 text-sm">
        {copy.save.saved}{" "}
        <Link href={localePath(locale, "/dashboard")} className="font-medium underline underline-offset-4">
          {copy.save.viewCases}
        </Link>
      </p>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("saving");
    try {
      await addRecord(caseRecordValues(memo, { caseNumber, courtName }));
      setState("saved");
    } catch {
      setState("failed");
    }
  }

  const ready = caseNumber.trim() !== "" && courtName.trim() !== "";

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="le-case-number" className="text-sm text-muted-foreground">
            {copy.save.caseNumber}
          </label>
          <Input id="le-case-number" value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} className="h-11" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="le-case-court" className="text-sm text-muted-foreground">
            {copy.save.courtName}
          </label>
          <Input id="le-case-court" value={courtName} onChange={(e) => setCourtName(e.target.value)} className="h-11" />
        </div>
      </div>
      {state === "failed" && (
        <p role="alert" className="text-sm text-destructive">
          {copy.save.failed}
        </p>
      )}
      <Button type="submit" disabled={!ready || state === "saving"} className="h-11 w-full sm:w-auto sm:px-6">
        {state === "saving" ? copy.save.saving : copy.save.submit}
      </Button>
    </form>
  );
}
