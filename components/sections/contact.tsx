"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Globe, Mail, MapPin, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OwnerCardDialog } from "@/components/owner/owner-card-dialog";
import { useContent } from "@/hooks/use-content";
import { useOwnerCard } from "@/hooks/use-owner-card";
import { useOwnerRole } from "@/hooks/use-owner-role";
import { getDemoSlug } from "@/lib/demo-slug";
import { selectInquiry, useInquiryTarget } from "@/lib/listing-inquiry";
import { config } from "@/lib/prototype-config";
import { localePath } from "@/lib/locale-routing";
import { cardIsEmpty, fullName, mapsHref, telHref, websiteHref, websiteText, type OwnerCard } from "@/lib/owner-contact";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "success" | "error";

/**
 * The owner's public profile (sw-factory spec 2026-09-29-golden-template-v2 §6.3, profile
 * fields 2026-10-09): only the fields the owner filled in; contact lines are links a phone
 * can act on.
 */
function OwnerCardView({ card }: { card: OwnerCard }) {
  const t = useTranslations("contact");
  const name = fullName(card);
  const website = websiteHref(card.website);
  const link = "flex min-h-11 items-center gap-3 break-words hover:underline";
  return (
    <address data-owner-card className="rounded-lg border border-border bg-card p-5 text-sm not-italic">
      {name && <p className="text-base font-semibold">{name}</p>}
      {card.headline && <p data-owner-headline className="text-muted-foreground">{card.headline}</p>}
      {card.bio && <p data-owner-bio className="mt-3 whitespace-pre-line">{card.bio}</p>}
      {card.serviceArea && (
        <p className="mt-3">
          <span className="text-muted-foreground">{t("serviceArea")}: </span>
          {card.serviceArea}
        </p>
      )}
      <ul className="mt-2 space-y-1">
        {card.address && (
          <li>
            <a
              href={mapsHref(card.address)}
              target="_blank"
              rel="noopener noreferrer"
              className={link}
              aria-label={t("mapLabel", { address: card.address })}
            >
              <MapPin aria-hidden className="size-4 shrink-0 text-primary" />
              {card.address}
            </a>
          </li>
        )}
        {card.phone && (
          <li>
            <a href={telHref(card.phone)} className={link} aria-label={t("callLabel", { phone: card.phone })}>
              <Phone aria-hidden className="size-4 shrink-0 text-primary" />
              {card.phone}
            </a>
          </li>
        )}
        {card.email && (
          <li>
            <a href={`mailto:${card.email}`} className={link} aria-label={t("emailLabel", { email: card.email })}>
              <Mail aria-hidden className="size-4 shrink-0 text-primary" />
              {card.email}
            </a>
          </li>
        )}
        {website && (
          <li>
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              className={link}
              aria-label={t("websiteLabel", { url: websiteText(website) })}
            >
              <Globe aria-hidden className="size-4 shrink-0 text-primary" />
              {websiteText(website)}
            </a>
          </li>
        )}
      </ul>
    </address>
  );
}

const phoneMode = config.patterns.contactForm?.phone ?? "hidden";

export function ContactSection() {
  const t = useTranslations("contact");
  const locale = useLocale();
  const copy = useContent().contactForm;
  const slug = getDemoSlug();
  const { status: owner, saveCard } = useOwnerRole();
  const [publicCard, setPublicCard] = useOwnerCard();
  const card = owner?.card ?? publicCard;
  const hasCard = !cardIsEmpty(card);
  const [editing, setEditing] = useState(false);

  const inquiry = useInquiryTarget();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
        body: JSON.stringify({
          slug,
          email,
          message,
          website,
          ...(name.trim() ? { name: name.trim() } : {}),
          ...(phoneMode !== "hidden" && phone.trim() ? { phone: phone.trim() } : {}),
          // The offer the visitor chose on a listing card; its title is sent as shown, so
          // the owner reads what the visitor read.
          ...(inquiry ? { listingId: inquiry.id, listingTitle: inquiry.title } : {}),
        }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (!res.ok || !body?.ok) throw new Error(`prototype-contact responded ${res.status}`);
      selectInquiry(null);
      setStatus("success");
    } catch (err) {
      console.error("[contact] failed to send:", err);
      setStatus("error");
    }
  }

  return (
    <section id="contact" data-section="contact" className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
      <h2 className="text-center text-3xl font-semibold tracking-tight">{copy?.heading ?? t("title")}</h2>
      {copy?.intro && <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">{copy.intro}</p>}

      {owner && (
        <div data-owner-controls className="mt-4 flex flex-wrap justify-center gap-2">
          <Button variant="outline" className="h-11" onClick={() => setEditing(true)}>
            {t("ownerEdit")}
          </Button>
          <Button asChild variant="ghost" className="h-11">
            <Link href={localePath(locale, "/messages")}>{t("ownerMessages", { count: owner.unreadMessages })}</Link>
          </Button>
        </div>
      )}

      <div className={cn("mt-8 grid gap-8", hasCard ? "md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" : "mx-auto max-w-xl")}>
        {hasCard && <OwnerCardView card={card} />}
        {status === "success" ? (
          <p className="rounded-lg border border-border bg-card p-6 text-center text-sm" role="status">
            {t("success")}
          </p>
        ) : (
          <div>
            {!slug && (
              // No demo slug means the endpoint has no prototype to identify — a real request
              // would 404. Local dev and the template's own /demo/golden build both have no
              // slug, so the form says so instead of pretending to work.
              <p className="mb-4 text-center text-sm text-muted-foreground" role="status">
                {t("notConfigured")}
              </p>
            )}

            {inquiry && (
              <p data-contact-regarding className="mb-4 flex items-center justify-between gap-2 rounded-md border border-primary px-3 py-2 text-sm">
                <span className="min-w-0 break-words">{t("regarding", { title: inquiry.title })}</span>
                <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" aria-label={t("clearRegarding")} onClick={() => selectInquiry(null)}>
                  <X aria-hidden className="size-4" />
                </Button>
              </p>
            )}

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              {/* A disabled fieldset disables every descendant control regardless of the
                  `contents` display below — that propagation is standard HTML form
                  behaviour, not something the CSS has to do. */}
              <fieldset disabled={!slug || status === "submitting"} className="contents">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-name" className="text-sm font-medium">
                    {t("name")}
                  </label>
                  <Input
                    id="contact-name"
                    name="name"
                    autoComplete="name"
                    maxLength={100}
                    className="h-11 text-base sm:text-sm"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-email" className="text-sm font-medium">
                  {t("email")}
                </label>
                <Input
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="h-11 text-base sm:text-sm"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              {phoneMode !== "hidden" && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="contact-phone" className="text-sm font-medium">
                    {phoneMode === "required" ? t("phone") : t("phoneOptional")}
                  </label>
                  <Input
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={30}
                    className="h-11 text-base sm:text-sm"
                    required={phoneMode === "required"}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-message" className="text-sm font-medium">
                  {t("message")}
                </label>
                <Textarea
                  id="contact-message"
                  name="message"
                  rows={4}
                  required
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
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

              <Button type="submit" className="h-11 w-full" disabled={!slug || status === "submitting"}>
                {status === "submitting" ? t("sending") : (copy?.submitLabel ?? t("send"))}
              </Button>
            </form>
          </div>
        )}
      </div>

      {owner && editing && (
        <OwnerCardDialog
          open
          onOpenChange={setEditing}
          card={card}
          onSave={async (next) => {
            setPublicCard(await saveCard(next));
          }}
        />
      )}
    </section>
  );
}
