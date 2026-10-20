"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Globe, Mail, MapPin, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { DISPLAY_H2, DisplayText, Eyebrow, Glow, PillButton, SECTION } from "./realestate-landing-ui";

type Status = "idle" | "submitting" | "success" | "error";

/**
 * This prototype's contact section: the template's `contact.tsx` — the same form, the
 * same endpoint, the same owner card and inbox, the same honeypot, the same disabled state
 * without a demo slug — laid out as the reference's closing card: the words on the left
 * with the accent's dot, the form on the right with underlined fields and a pill to send.
 * The template's file stays untouched so a refresh merges clean; the DOM its tests hold
 * (`#contact`, the field ids, the one `role="status"`, the submit button's exact name,
 * `[data-owner-card]`, `[data-owner-controls]`) is kept to the letter.
 */

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
    <address data-owner-card className="rounded-2xl bg-background/60 p-5 text-sm not-italic ring-1 ring-foreground/10">
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
            <a href={mapsHref(card.address)} target="_blank" rel="noopener noreferrer" className={link} aria-label={t("mapLabel", { address: card.address })}>
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
            <a href={website} target="_blank" rel="noopener noreferrer nofollow ugc" className={link} aria-label={t("websiteLabel", { url: websiteText(website) })}>
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

/** An underlined field, as on the reference: no box, a rule that darkens on focus. 16px
 * text so a phone never zooms into it. */
const FIELD =
  "w-full min-w-0 rounded-none border-0 border-b border-foreground/25 bg-transparent px-0 py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-foreground disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none";
const LABEL = "text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground";

export function RealEstateContact() {
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
    // The fieldset below is already disabled with no slug, so this is unreachable from the
    // rendered UI — but "disabled" is a DOM/CSS state, not a guarantee against every path
    // that can fire a submit event. The handler refuses on its own terms too.
    if (!slug || status === "submitting") return;

    setStatus("submitting");
    try {
      // Absolute path, deliberately NOT prefixed with NEXT_PUBLIC_BASE_PATH: the Cloud
      // Function (factory-web's `prototypeContact`) is rewritten at the SITE ROOT, while
      // this page is served under /newapp/<slug>/.
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
    <section id="contact" data-section="contact" className={cn(SECTION, "scroll-mt-20")}>
      <div data-reveal className="relative isolate overflow-hidden rounded-3xl bg-card/60 p-6 ring-1 ring-foreground/10 sm:p-10 lg:p-14">
        <Glow className="-right-24 -top-32 h-[26rem] w-[26rem]" />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
          <div className="flex flex-col items-start gap-6">
            <Eyebrow>{t("title")}</Eyebrow>
            <h2 className={DISPLAY_H2}>
              <DisplayText text={copy?.heading ?? t("title")} />
            </h2>
            {copy?.intro && <p className="max-w-md text-pretty text-muted-foreground sm:text-lg">{copy.intro}</p>}

            {owner && (
              <div data-owner-controls className="flex flex-wrap gap-2">
                <Button variant="outline" className="h-11 rounded-full px-5" onClick={() => setEditing(true)}>
                  {t("ownerEdit")}
                </Button>
                <Button asChild variant="ghost" className="h-11 rounded-full px-5">
                  <Link href={localePath(locale, "/messages")}>{t("ownerMessages", { count: owner.unreadMessages })}</Link>
                </Button>
              </div>
            )}

            {hasCard && <OwnerCardView card={card} />}
          </div>

          {status === "success" ? (
            <p className="self-center rounded-2xl bg-background/60 p-6 text-center text-sm ring-1 ring-foreground/10" role="status">
              {t("success")}
            </p>
          ) : (
            <div>
              {!slug && (
                // No demo slug means the endpoint has no prototype to identify — a real request
                // would 404. Local dev and the template's own /demo/golden build both have no
                // slug, so the form says so instead of pretending to work.
                <p className="mb-6 text-sm text-muted-foreground" role="status">
                  {t("notConfigured")}
                </p>
              )}

              {inquiry && (
                <p data-contact-regarding className="mb-6 flex items-center justify-between gap-2 rounded-2xl border border-primary px-4 py-2 text-sm">
                  <span className="min-w-0 break-words">{t("regarding", { title: inquiry.title })}</span>
                  <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" aria-label={t("clearRegarding")} onClick={() => selectInquiry(null)}>
                    <X aria-hidden className="size-4" />
                  </Button>
                </p>
              )}

              <form className="flex flex-col gap-7" onSubmit={handleSubmit}>
                {/* A disabled fieldset disables every descendant control regardless of the
                    `contents` display below — standard HTML form behaviour. */}
                <fieldset disabled={!slug || status === "submitting"} className="contents">
                  <div className="grid gap-7 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="contact-name" className={LABEL}>
                        {t("name")}
                      </label>
                      <input id="contact-name" name="name" type="text" autoComplete="name" maxLength={100} className={FIELD} value={name} onChange={(event) => setName(event.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="contact-email" className={LABEL}>
                        {t("email")}
                      </label>
                      <input id="contact-email" name="email" type="email" autoComplete="email" className={FIELD} required value={email} onChange={(event) => setEmail(event.target.value)} />
                    </div>
                    {phoneMode !== "hidden" && (
                      <div className="flex flex-col gap-1 sm:col-span-2">
                        <label htmlFor="contact-phone" className={LABEL}>
                          {phoneMode === "required" ? t("phone") : t("phoneOptional")}
                        </label>
                        <input id="contact-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={30} className={FIELD} required={phoneMode === "required"} value={phone} onChange={(event) => setPhone(event.target.value)} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="contact-message" className={LABEL}>
                      {t("message")}
                    </label>
                    <textarea id="contact-message" name="message" rows={4} required className={cn(FIELD, "min-h-28 resize-y")} value={message} onChange={(event) => setMessage(event.target.value)} />
                  </div>

                  {/* Honeypot. A bot that fills every input in the DOM fills this one; a sighted
                      visitor never sees it because the WRAPPER (not the input) is display:none —
                      some bots specifically skip an input that is itself hidden — and a screen
                      reader never reaches it either, because display:none removes the whole
                      subtree from the accessibility tree. tabIndex={-1} keeps it out of the Tab
                      order as a second guard. Its label is plain English, not translated: by
                      construction nobody ever encounters it. */}
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="contact-website">Leave this field blank</label>
                    <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
                  </div>
                </fieldset>

                {status === "error" && (
                  <p className="text-sm text-destructive" role="alert">
                    {t("error")}
                  </p>
                )}

                <PillButton type="submit" variant="solid" className="w-full sm:w-auto sm:self-start" disabled={!slug || status === "submitting"}>
                  {status === "submitting" ? t("sending") : (copy?.submitLabel ?? t("send"))}
                </PillButton>
              </form>
            </div>
          )}
        </div>
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
