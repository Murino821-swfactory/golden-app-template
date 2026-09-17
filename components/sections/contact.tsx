"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useContent } from "@/hooks/use-content";

export function ContactSection() {
  const t = useTranslations("contact");
  const copy = useContent().contactForm;

  return (
    <section
      data-section="contact"
      className="mx-auto w-full max-w-xl px-4 py-16 sm:py-24"
    >
      <h2 className="text-center text-3xl font-semibold tracking-tight">
        {copy?.heading ?? t("title")}
      </h2>
      <form
        className="mt-8 flex flex-col gap-4"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-email" className="text-sm font-medium">
            {t("email")}
          </label>
          <Input id="contact-email" name="email" type="email" required />
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
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </div>
        <Button type="submit" className="w-full">
          {copy?.submitLabel ?? t("send")}
        </Button>
      </form>
    </section>
  );
}
