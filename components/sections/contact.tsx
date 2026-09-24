"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useContent } from "@/hooks/use-content";
import { getDemoSlug } from "@/lib/demo-slug";

type Status = "idle" | "submitting" | "success" | "error";

export function ContactSection() {
  const t = useTranslations("contact");
  const copy = useContent().contactForm;
  const slug = getDemoSlug();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — see the hidden wrapper below
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Belt and suspenders: the fieldset below is already disabled with no slug, so this
    // is unreachable from the rendered UI — but "disabled" is a DOM/CSS state, not a
    // guarantee against every path that can fire a submit event, and a silently-inert
    // control is the exact defect this task exists to remove (Global Constraint 2). The
    // handler refuses on its own terms too.
    if (!slug || status === "submitting") return;

    setStatus("submitting");
    try {
      // Absolute path, deliberately NOT prefixed with NEXT_PUBLIC_BASE_PATH. The
      // Cloud Function (factory-web's `prototypeContact`) is rewritten at the SITE
      // ROOT (tokenwise.sk/api/prototype-contact), while this page is served under
      // /newapp/<slug>/ — a base-path-prefixed URL would ask for a route that
      // doesn't exist there.
      const res = await fetch("/api/prototype-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email, message, website }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (!res.ok || !body?.ok) throw new Error(`prototype-contact responded ${res.status}`);
      setStatus("success");
    } catch (err) {
      console.error("[contact] failed to send:", err);
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <section
        data-section="contact"
        className="mx-auto w-full max-w-xl px-4 py-16 sm:py-24"
      >
        <h2 className="text-center text-3xl font-semibold tracking-tight">
          {copy?.heading ?? t("title")}
        </h2>
        <p
          className="mt-8 rounded-lg border border-border bg-card p-6 text-center text-sm"
          role="status"
        >
          {t("success")}
        </p>
      </section>
    );
  }

  return (
    <section
      data-section="contact"
      className="mx-auto w-full max-w-xl px-4 py-16 sm:py-24"
    >
      <h2 className="text-center text-3xl font-semibold tracking-tight">
        {copy?.heading ?? t("title")}
      </h2>

      {!slug && (
        // No demo slug means the endpoint has no prototype to identify — a real request
        // would 404. Local dev and the template's own /demo/golden build both have no
        // slug, so the form says so instead of pretending to work.
        <p
          className="mt-4 text-center text-sm text-muted-foreground"
          role="status"
        >
          {t("notConfigured")}
        </p>
      )}

      <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
        {/* A disabled fieldset disables every descendant control regardless of the
            `contents` display below — that propagation is standard HTML form
            behaviour, not something the CSS has to do. */}
        <fieldset disabled={!slug || status === "submitting"} className="contents">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact-email" className="text-sm font-medium">
              {t("email")}
            </label>
            <Input
              id="contact-email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact-message" className="text-sm font-medium">
              {t("message")}
            </label>
            <textarea
              id="contact-message"
              name="message"
              rows={4}
              required
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
            />
          </div>

          {/* Honeypot. A bot that fills every input in the DOM fills this one; a sighted
              visitor never sees it because the WRAPPER (not the input) is display:none —
              some bots specifically skip an input that is itself hidden, so hiding it one
              level up defeats that check — and a screen reader never reaches it either,
              because display:none removes the whole subtree from the accessibility tree.
              tabIndex={-1} keeps it out of the Tab order as a second guard for any
              assistive tech that doesn't honour display:none. Its label is plain English,
              not run through useTranslations: by construction nobody — sighted, screen
              reader, any locale — ever encounters it, so it is not "user-visible copy" in
              the sense the rest of this file's strings are. */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="contact-website">Leave this field blank</label>
            <input
              id="contact-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>
        </fieldset>

        {status === "error" && (
          <p className="text-sm text-destructive" role="alert">
            {t("error")}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={!slug || status === "submitting"}
        >
          {status === "submitting" ? t("sending") : (copy?.submitLabel ?? t("send"))}
        </Button>
      </form>
    </section>
  );
}
