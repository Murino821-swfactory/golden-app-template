"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { FirestoreError } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRecords } from "@/hooks/use-records";
import { cn } from "@/lib/utils";

/**
 * quick-log-parser — paste a terminal rate-limit message and turn it into a session record.
 *
 * The parser is intentionally forgiving: if it can read a reset time it sets the countdown
 * and tags the record; if it cannot, it still files the session as "Waiting for Reset" so
 * nothing is lost. All parsing is pure string work — no eval, no HTML — so a pasted log is
 * never a trust boundary beyond the single Firestore write, which the deployed rules bind to
 * the record owner.
 */

export interface ParsedLog {
  /** The detected reset time, or null when none could be read. */
  resetAt: Date | null;
  /** The agent the log mentions; defaults to Claude Code. */
  agent: string;
}

/** Which agent the message is about — matched to the entity's configured option values. */
function detectAgent(text: string): string {
  if (/codex/i.test(text)) return "OpenAI Codex";
  if (/\bcontinue\b/i.test(text)) return "Continue";
  return "Claude Code";
}

/** An explicit stamp like "Sep 30, 2026, 2:55 AM" (comma before the time is optional). */
function parseExplicitDate(text: string): Date | null {
  const m = text.match(
    /\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})\s*(am|pm)?/i
  );
  if (!m) return null;
  const normalized = `${m[1]} ${m[2]}, ${m[3]} ${m[4]}:${m[5]} ${m[6] ?? ""}`.trim();
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** A clock time like "resets 3am", "resets 3:00 AM", or "try again at 03:00". */
function parseResetTime(text: string): Date | null {
  const m = text.match(
    /(?:resets?|try again(?:\s+at)?|reset at|again at|at)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i
  );
  if (!m) return null;

  let hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = m[3]?.toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;

  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  // A reset earlier in the day than "now" means tomorrow.
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

/** Pure: read an agent and (if present) a reset time out of a pasted terminal message. */
export function parseTerminalLog(text: string): ParsedLog {
  return {
    agent: detectAgent(text),
    resetAt: parseExplicitDate(text) ?? parseResetTime(text),
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export interface QuickLogParserProps {
  /** Lifts a detected reset time up to the shared countdown. */
  onResetDetected?: (target: Date) => void;
  /** Fired after a record is written, so the grid can refetch. */
  onAdded?: () => void;
  className?: string;
}

export function QuickLogParser({
  onResetDetected,
  onAdded,
  className,
}: QuickLogParserProps) {
  const t = useTranslations("logParser");
  const tGrid = useTranslations("dataGrid");
  const { addRecord } = useRecords();

  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "error"; message: string } | null>(
    null
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setStatus({ type: "error", message: t("empty") });
      return;
    }

    setSubmitting(true);
    setStatus(null);
    const parsed = parseTerminalLog(trimmed);

    try {
      const now = new Date();
      const startedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
        now.getDate()
      )}`;
      await addRecord({
        agent: parsed.agent,
        status: "Waiting for Reset",
        startedAt,
        mode: "Cloud API",
        tokensUsed: "",
        task: trimmed.slice(0, 140),
      });
      if (parsed.resetAt) onResetDetected?.(parsed.resetAt);
      onAdded?.();
      setText("");
      setStatus({
        type: "ok",
        message: parsed.resetAt ? t("addedWithTime") : t("added"),
      });
    } catch (err) {
      // Never surface a raw Firestore error to the visitor — same treatment as the grid.
      console.error("[quick-log-parser] failed to add record:", err);
      const message =
        err instanceof FirestoreError
          ? tGrid(err.code === "permission-denied" ? "permissionDenied" : "loadError")
          : tGrid("loadError");
      setStatus({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className={cn("", className)} data-testid="quick-log-parser">
      <CardContent className="p-4 sm:p-6">
        <h3 className="mb-3 text-lg font-medium">{t("title")}</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <Input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            className="h-11 flex-1"
          />
          <Button type="submit" size="lg" className="min-h-11" disabled={submitting}>
            {t("analyze")}
          </Button>
        </form>
        {status && (
          <p
            role={status.type === "error" ? "alert" : "status"}
            className={
              status.type === "error"
                ? "mt-3 text-sm text-destructive"
                : "mt-3 text-sm text-emerald-400"
            }
          >
            {status.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
