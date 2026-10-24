import { publishSocial, type GetToken } from "./api";
import type { SocialNetwork, SocialResult, UiError } from "./types";

/**
 * social.ts — the direct route: a post made for real on the Tokenwise Facebook Page or
 * Instagram account through `/api/gitpulse/publish` (factory-web). The server lets only
 * the founder through — the role the owner-contact status call already reports as
 * `admin` — so the buttons offer it to nobody else; every other visitor keeps the share
 * sheet (`lib/studio/publish.ts`, `lib/gitpulse/share.ts`). Instagram takes JPEG only, so
 * a PNG card or a Gemini visual is re-encoded in the browser before it goes up.
 */

export type PublishRoute = "direct" | "share";

/** Direct only for the founder, and only where the server can post: Facebook and Instagram. */
export function publishRouteFor(role: "owner" | "admin" | null | undefined, channel: string): PublishRoute {
  return role === "admin" && (channel === "facebook" || channel === "instagram") ? "direct" : "share";
}

/** Instagram feed images: between 4:5 and 1.91:1 (mirrors the server's check). */
export function instagramAspectOk(width: number, height: number): boolean {
  const ratio = width / height;
  return ratio >= 0.8 - 1e-3 && ratio <= 1.91 + 1e-3;
}

export interface JpegImage {
  dataUri: string;
  width: number;
  height: number;
}

/** Re-encode any image (a Blob or a data URI) as a JPEG, flattened on black. Browser only. */
export async function toJpeg(source: Blob | string, quality = 0.92): Promise<JpegImage> {
  const blob = typeof source === "string" ? await (await fetch(source)).blob() : source;
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d context unavailable");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    return { dataUri: canvas.toDataURL("image/jpeg", quality), width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

export type DirectOutcome =
  | { ok: true; result: Extract<SocialResult, { ok: true }> }
  | { ok: false; reason: "aspect" }
  | { ok: false; reason: "api"; error: UiError }
  | { ok: false; reason: "meta"; message: string };

/** One click, one network: encode, check what the network will take, post, report. */
export async function directPublish(
  input: { network: SocialNetwork; caption: string; image: Blob | string },
  getToken: GetToken
): Promise<DirectOutcome> {
  let jpeg: JpegImage;
  try {
    jpeg = await toJpeg(input.image);
  } catch {
    return { ok: false, reason: "api", error: "internal" };
  }
  if (input.network === "instagram" && !instagramAspectOk(jpeg.width, jpeg.height)) return { ok: false, reason: "aspect" };
  const out = await publishSocial({ network: input.network, caption: input.caption, image: jpeg.dataUri }, getToken);
  if (!out.ok) return { ok: false, reason: "api", error: out.error };
  const result = out.data.result;
  return result.ok ? { ok: true, result } : { ok: false, reason: "meta", message: result.error };
}
