/** The owner's inbox — contact-form messages stored by factory-web `prototypeContact`. Pure. */
import type { OwnerRole } from "./owner-contact";

export interface InboxMessage {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  /** The offer (pattern `listings`) the visitor asked about, as it was titled when sent. */
  listing?: { id: string; title: string };
  message: string;
  createdAt: Date;
  read: boolean;
}

type Stamp = { toDate(): Date } | null | undefined;

export function parseMessage(id: string, data: Record<string, unknown>): InboxMessage | null {
  if (typeof data.email !== "string" || typeof data.message !== "string") return null;
  const created = data.createdAt as Stamp;
  const readAt = data.readAt as Stamp;
  return {
    id,
    email: data.email,
    ...(typeof data.name === "string" && data.name ? { name: data.name } : {}),
    ...(typeof data.phone === "string" && data.phone ? { phone: data.phone } : {}),
    ...(typeof data.listingId === "string" && data.listingId && typeof data.listingTitle === "string" && data.listingTitle
      ? { listing: { id: data.listingId, title: data.listingTitle } }
      : {}),
    message: data.message,
    createdAt: created && typeof created.toDate === "function" ? created.toDate() : new Date(0),
    read: Boolean(readAt),
  };
}

export type InboxView = "not-configured" | "checking" | "forbidden" | "ready";

/** `role` undefined = the server has not answered yet. */
export function inboxView({ available, role }: { available: boolean; role: OwnerRole | null | undefined }): InboxView {
  if (!available) return "not-configured";
  if (role === undefined) return "checking";
  return role ? "ready" : "forbidden";
}

export const replyHref = (msg: InboxMessage, appName: string) =>
  `mailto:${msg.email}?subject=${encodeURIComponent(`Re: ${appName}`)}`;

export const unreadCount = (messages: readonly InboxMessage[]) => messages.filter((m) => !m.read).length;
