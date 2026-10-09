"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { OwnerCard, OwnerCardField } from "@/lib/owner-contact";

// Limits mirror factory-web `owner-contact-core.ts` LIMITS — the server refuses longer.
const FIELDS: Array<{ key: OwnerCardField; autoComplete: string; type: string; max: number; multiline?: boolean }> = [
  { key: "firstName", autoComplete: "given-name", type: "text", max: 60 },
  { key: "lastName", autoComplete: "family-name", type: "text", max: 60 },
  { key: "headline", autoComplete: "organization-title", type: "text", max: 80 },
  { key: "bio", autoComplete: "off", type: "text", max: 600, multiline: true },
  { key: "serviceArea", autoComplete: "off", type: "text", max: 120 },
  { key: "address", autoComplete: "street-address", type: "text", max: 200 },
  { key: "phone", autoComplete: "tel", type: "tel", max: 30 },
  { key: "email", autoComplete: "email", type: "email", max: 200 },
  { key: "website", autoComplete: "url", type: "url", max: 200 },
];
const LABEL_KEY: Record<OwnerCardField, string> = {
  firstName: "firstName",
  lastName: "lastName",
  address: "address",
  phone: "phone",
  email: "emailField",
  headline: "headline",
  bio: "bio",
  serviceArea: "serviceArea",
  website: "website",
};

export function OwnerCardDialog({
  open,
  onOpenChange,
  card,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: OwnerCard;
  onSave: (card: OwnerCard) => Promise<void>;
}) {
  const t = useTranslations("contact");
  const tc = useTranslations("common");
  const [values, setValues] = useState<OwnerCard>(card);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const next: OwnerCard = {};
      for (const f of FIELDS) {
        const v = values[f.key]?.trim();
        if (v) next[f.key] = v;
      }
      await onSave(next);
      onOpenChange(false);
    } catch (err) {
      console.error("[owner] card save failed:", err);
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={tc("close")}>
        <DialogTitle>{t("ownerEdit")}</DialogTitle>
        <DialogDescription>{t("publicNotice")}</DialogDescription>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <label htmlFor={`owner-${f.key}`} className="text-sm text-muted-foreground">{t(LABEL_KEY[f.key])}</label>
              {f.multiline ? (
                <Textarea
                  id={`owner-${f.key}`}
                  rows={4}
                  maxLength={f.max}
                  className="text-base sm:text-sm"
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                />
              ) : (
                <Input
                  id={`owner-${f.key}`}
                  type={f.type}
                  autoComplete={f.autoComplete}
                  maxLength={f.max}
                  placeholder={f.key === "website" ? "https://" : undefined}
                  className="h-11 text-base sm:text-sm"
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
          {error && <p className="text-sm text-destructive" role="alert">{t("saveError")}</p>}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" className="h-11" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button type="submit" className="h-11" disabled={busy}>{busy ? t("saving") : t("save")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
