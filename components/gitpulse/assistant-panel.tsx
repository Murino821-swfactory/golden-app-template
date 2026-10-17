"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askAssistant } from "@/lib/gitpulse/api";
import type { GitpulseCopy } from "@/lib/gitpulse/copy";
import { getIdToken } from "@/lib/gitpulse/token";
import type { AssistantTurn, Digest, GitpulseLocale, UiError } from "@/lib/gitpulse/types";
import { ErrorLine, StepCard } from "./ui";

/**
 * The studio's voice assistant. The brain is `/api/gitpulse/assistant`; the mouth is the
 * browser's speechSynthesis; the ears are SpeechRecognition WHERE THE BROWSER GRANTS THEM —
 * apps.tokenwise.sk ships `Permissions-Policy: microphone=()` (a deliberate isolation rule
 * for the shared prototype origin), so on the live origin the mic button degrades to the
 * explanatory note and the assistant stays a typed chat that talks back.
 */

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

function recognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRecognitionLike) | null;
}

const MAX_TURNS = 12;

export function AssistantPanel({ digest, copy }: { digest: Digest | null; copy: GitpulseCopy }) {
  const locale = useLocale() as GitpulseLocale;
  const [turns, setTurns] = useState<AssistantTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const [speak, setSpeak] = useState(true);
  const [listening, setListening] = useState(false);
  const [micBlocked, setMicBlocked] = useState(false);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const c = copy.assistant;

  useEffect(() => () => {
    recognition.current?.stop();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  function sayAloud(text: string) {
    if (!speak || typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale === "cs" ? "cs-CZ" : "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  async function send(raw: string) {
    const content = raw.trim().slice(0, 500);
    if (!content || busy) return;
    const next = [...turns, { role: "user" as const, content }].slice(-MAX_TURNS);
    setTurns(next);
    setInput("");
    setBusy(true);
    setError(null);
    const out = await askAssistant({ messages: next, locale, digest: digest ?? undefined }, getIdToken);
    setBusy(false);
    if (out.ok) {
      setTurns((t) => [...t, { role: "assistant" as const, content: out.data.reply }].slice(-MAX_TURNS));
      sayAloud(out.data.reply);
    } else setError(out.error);
  }

  function toggleMic() {
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setMicBlocked(true);
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = locale === "cs" ? "cs-CZ" : "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript ?? "";
        if (transcript) void send(transcript);
      };
      rec.onerror = () => {
        setListening(false);
        setMicBlocked(true);
      };
      rec.onend = () => setListening(false);
      recognition.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setMicBlocked(true);
    }
  }

  return (
    <StepCard title={c.title} description={c.hint}>
      {turns.length > 0 && (
        <div className="max-h-64 space-y-2 overflow-y-auto" data-testid="gitpulse-assistant-log">
          {turns.map((turn, i) => (
            <p key={i} className={`rounded-lg px-3 py-2 text-sm ${turn.role === "user" ? "bg-muted" : "bg-primary/10"}`}>
              {turn.content}
            </p>
          ))}
          {busy && <p className="px-3 text-sm text-muted-foreground">{c.thinking}</p>}
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => { e.preventDefault(); void send(input); }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={c.placeholder}
          maxLength={500}
          className="h-10 flex-1"
          aria-label={c.placeholder}
        />
        <Button type="submit" disabled={busy || !input.trim()} className="h-10">{c.send}</Button>
        <Button type="button" variant="outline" className="h-10" onClick={toggleMic} aria-pressed={listening}>
          {listening ? c.micStop : c.micStart}
        </Button>
      </form>
      {micBlocked && <p className="text-xs text-muted-foreground">{c.micUnavailable}</p>}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={speak} onChange={(e) => setSpeak(e.target.checked)} />
        {c.speakReplies}
      </label>
      <ErrorLine error={error} copy={copy} />
    </StepCard>
  );
}
