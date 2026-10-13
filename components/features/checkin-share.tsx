"use client";

import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PILLARS, addDays, type CheckinLog, type DayKey, type PillarId } from "@/lib/checkin-engine";
import { COPY, type CheckinLocale } from "@/lib/checkin-copy";

/**
 * The share card: a square image drawn on a canvas from the visitor's own numbers, handed
 * to the system share sheet (Web Share API with files — Instagram, WhatsApp, Messages) or
 * downloaded where that API is missing. The one growth loop a solo habit app has
 * (research 2026-10-13: Duolingo's share cards and year-in-review are its best-documented
 * organic channel), so the card carries the app's URL.
 *
 * Colours are read from the palette on screen, so "Change colour" repaints the card too.
 */

export interface ShareCardData {
  appName: string;
  streak: number;
  levelName: string;
  pillars: { id: PillarId; label: string; streak: number }[];
  log: CheckinLog;
  today: DayKey;
  url: string;
}

const SIZE = 1080;

function cssColor(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function drawShareCard(canvas: HTMLCanvasElement, data: ShareCardData, locale: CheckinLocale): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  const c = COPY[locale];
  const bg = cssColor("--background", "#171717");
  const card = cssColor("--card", "#1f1f1f");
  const ink = cssColor("--foreground", "#fafafa");
  const muted = cssColor("--muted-foreground", "#a3a3a3");
  const accent = cssColor("--primary", "#e3c586");
  const font = getComputedStyle(document.body).fontFamily || "sans-serif";

  canvas.width = SIZE;
  canvas.height = SIZE;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // A card inside the square, so the image reads as a card on any feed background.
  const pad = 64;
  ctx.fillStyle = card;
  ctx.beginPath();
  ctx.roundRect(pad, pad, SIZE - 2 * pad, SIZE - 2 * pad, 48);
  ctx.fill();

  const x = pad + 64;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = accent;
  ctx.font = `700 34px ${font}`;
  ctx.fillText(data.appName.toUpperCase(), x, pad + 112);
  ctx.fillStyle = muted;
  ctx.font = `500 30px ${font}`;
  ctx.fillText(c.shareCardLevel(data.levelName), x, pad + 160);

  ctx.fillStyle = ink;
  ctx.font = `800 220px ${font}`;
  ctx.fillText(String(data.streak), x - 8, pad + 390);
  ctx.fillStyle = accent;
  ctx.font = `700 44px ${font}`;
  ctx.fillText(c.shareCardStreak(data.streak), x, pad + 452);

  // One row per pillar: name, the last seven days as dots, the pillar's streak.
  const rowTop = pad + 520;
  const rowH = 62;
  const days = Array.from({ length: 7 }, (_, i) => addDays(data.today, i - 6));
  data.pillars.forEach((p, i) => {
    const y = rowTop + i * rowH;
    ctx.fillStyle = ink;
    ctx.font = `600 30px ${font}`;
    ctx.fillText(p.label, x, y);
    days.forEach((d, j) => {
      const done = data.log[d]?.done.includes(p.id) ?? false;
      ctx.beginPath();
      ctx.arc(x + 330 + j * 44, y - 11, 13, 0, Math.PI * 2);
      ctx.fillStyle = done ? accent : muted;
      ctx.globalAlpha = done ? 1 : 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    ctx.fillStyle = muted;
    ctx.font = `600 30px ${font}`;
    ctx.textAlign = "right";
    ctx.fillText(String(p.streak), SIZE - pad - 64, y);
    ctx.textAlign = "left";
  });

  ctx.fillStyle = ink;
  ctx.font = `italic 500 34px ${font}`;
  ctx.fillText(c.shareCardTagline, x, SIZE - pad - 112);
  ctx.fillStyle = muted;
  ctx.font = `500 28px ${font}`;
  ctx.fillText(data.url.replace(/^https?:\/\//, ""), x, SIZE - pad - 64);
  return true;
}

export function ShareButton({ data, locale }: { data: ShareCardData; locale: CheckinLocale }) {
  const c = COPY[locale];
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState<{ blob: Blob; src: string } | null>(null);
  const [failed, setFailed] = useState(false);

  // An object URL is released when the card is redrawn or the button unmounts.
  useEffect(
    () => () => {
      if (card) URL.revokeObjectURL(card.src);
    },
    [card]
  );

  // Drawn on every open, in the click handler: the numbers may have moved since last time.
  const draw = () => {
    setOpen(true);
    setFailed(false);
    const canvas = document.createElement("canvas");
    if (!drawShareCard(canvas, data, locale)) {
      setFailed(true);
      return;
    }
    canvas.toBlob((b) => {
      if (!b) {
        setFailed(true);
        return;
      }
      setCard({ blob: b, src: URL.createObjectURL(b) });
    }, "image/png");
  };

  const blob = card?.blob ?? null;
  const src = card?.src ?? null;
  const file = blob ? new File([blob], "unbroken-streak.png", { type: "image/png" }) : null;
  const canShare = typeof navigator !== "undefined" && !!file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: data.appName, text: `${c.shareCardStreak(data.streak)} — ${c.shareCardTagline} ${data.url}` });
    } catch {
      // The visitor closed the sheet; nothing to report.
    }
  };

  return (
    <>
      <Button type="button" variant="outline" size="lg" onClick={draw} data-testid="share-open">
        <Share2 aria-hidden data-icon="inline-start" />
        {c.share}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={c.close} aria-describedby={undefined}>
          <DialogTitle>{c.shareTitle}</DialogTitle>
          <DialogDescription>{c.shareBody}</DialogDescription>
          <div className="mt-4 space-y-4">
            {failed ? (
              <p className="text-sm text-destructive">{c.shareFailed}</p>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              src && <img src={src} alt={c.shareImageAlt} data-testid="share-image" className="w-full rounded-lg ring-1 ring-border" />
            )}
            <div className="flex flex-wrap gap-2">
              {canShare && (
                <Button type="button" size="lg" onClick={share}>
                  <Share2 aria-hidden data-icon="inline-start" />
                  {c.shareNow}
                </Button>
              )}
              {src && (
                <Button asChild variant={canShare ? "outline" : "default"} size="lg">
                  <a href={src} download="unbroken-streak.png" data-testid="share-download">
                    {c.shareDownload}
                  </a>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const SHARE_PILLARS = PILLARS;
