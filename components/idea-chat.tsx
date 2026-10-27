"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getDemoSlug } from "@/lib/demo-slug";
import { IDEA_MAX, ideaChatView, ideaPayload, postIdea, validateIdea, type IdeaStatus } from "@/lib/idea-chat";
import { cn } from "@/lib/utils";

/**
 * The idea chat (founder, 2026-10-27): a floating launcher in the corner of every page
 * opens a chat whose first line is the owner's question — "Want to improve this app? I'm
 * looking forward to your idea." The visitor writes the idea (and, if they like, an e-mail
 * for the answer), sends it, and the bot confirms that it is now a task on the owner's
 * dashboard. The rules are `lib/idea-chat.ts`; the texts `ideaChat` in `messages/*.json`.
 *
 * No request leaves the page until the visitor sends — the smoke gate's console must stay
 * clean on a build with no API behind it — and without a slug the chat says it works on
 * the published app, like the contact form.
 */
export function IdeaChat() {
  const t = useTranslations("ideaChat");
  const slug = getDemoSlug();
  const [open, setOpen] = useState(false);
  const [idea, setIdea] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<IdeaStatus>("idle");
  const [sentIdea, setSentIdea] = useState<string | null>(null);
  const view = ideaChatView({ slug, status, ideaValid: validateIdea(idea) === null });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slug || !view.canSend) return;
    const payload = ideaPayload({ slug, idea, email, website, page: window.location.pathname });
    setStatus("submitting");
    setSentIdea(payload.idea);
    try {
      const res = await postIdea(payload);
      if (res.status === 429) {
        setStatus("tooMany");
        return;
      }
      if (!res.ok) throw new Error(`prototype-idea responded ${res.status}`);
      setStatus("sent");
    } catch (err) {
      console.error("[idea-chat] failed to send:", err);
      setStatus("error");
    }
  }

  return (
    <>
      <button
        type="button"
        data-idea-launcher
        aria-label={t("open")}
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:bottom-6 sm:right-6"
      >
        <MessageSquarePlus className="size-6" aria-hidden />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={t("close")} aria-describedby={undefined}>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription className="sr-only">{t("greeting")}</DialogDescription>

          <ol data-idea-log role="log" aria-live="polite" className="mt-4 space-y-2">
            <Bubble from="bot">{t("greeting")}</Bubble>
            {sentIdea !== null && <Bubble from="you">{sentIdea}</Bubble>}
            {view.bot !== "greeting" && <Bubble from="bot">{t(view.bot)}</Bubble>}
          </ol>

          {status !== "sent" && (
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <fieldset disabled={!view.canType} className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="idea-chat-text" className="text-sm font-medium">
                    {t("ideaLabel")}
                  </label>
                  <Textarea
                    id="idea-chat-text"
                    required
                    rows={4}
                    maxLength={IDEA_MAX}
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder={t("placeholder")}
                  />
                  <p className="text-xs text-muted-foreground">{t("hint")}</p>
                </div>
                <div className="space-y-1">
                  <label htmlFor="idea-chat-email" className="text-sm font-medium">
                    {t("email")}
                  </label>
                  <Input id="idea-chat-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                {/* Honeypot: hidden from people, filled by bots. The server answers a silent 200. */}
                <div aria-hidden="true" className="hidden">
                  <label>
                    Website
                    <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </label>
                </div>
              </fieldset>
              <Button type="submit" className="h-11 w-full" disabled={!view.canSend}>
                {status === "submitting" ? t("sending") : t("send")}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Bubble({ from, children }: { from: "bot" | "you"; children: React.ReactNode }) {
  return (
    <li
      data-idea-bubble={from}
      className={cn(
        "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm",
        from === "bot" ? "mr-auto rounded-bl-sm bg-muted text-foreground" : "ml-auto rounded-br-sm bg-primary text-primary-foreground"
      )}
    >
      {children}
    </li>
  );
}
