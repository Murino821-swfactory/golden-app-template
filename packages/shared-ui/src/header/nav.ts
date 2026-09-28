/**
 * The nav of each tokenwise.sk variant — here, not in the host, so the site's nav exists in
 * one place. The desktop row and the mobile menu both read `navFor`, so the two can never
 * drift apart.
 *
 * A prototype carries tokenwise.sk's public nav 1:1 (founder decision 2026-09-28). It is
 * served from another origin (apps.tokenwise.sk), so the host passes `siteOrigin` and every
 * link is made absolute to it; without one a prototype gets no nav, never links into itself.
 */
export type HeaderVariant = "landing" | "public" | "dashboard" | "admin" | "prototype";

export interface NavItem {
  label: string;
  href?: string;
  /** `contact` opens the host's contact modal instead of navigating. */
  action?: "contact";
}

const PUBLIC_NAV: readonly NavItem[] = [
  { label: "Articles", href: "/articles" },
  { label: "Arena", href: "/compare" },
  { label: "Projects", href: "/projects" },
  { label: "Ideas", href: "/ideas" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Privacy", href: "/privacy" },
];

const DASHBOARD_NAV: readonly NavItem[] = [{ label: "How It Works", href: "/how-it-works" }];

const ADMIN_NAV: readonly NavItem[] = [
  { label: "Projects", href: "/admin/projects" },
  { label: "Prototypes", href: "/admin/prototypes" },
  { label: "Customers", href: "/admin/customers" },
  { label: "Leaderboard", href: "/admin/leaderboard" },
  { label: "Requests", href: "/admin/requests" },
];

export interface NavOptions {
  /** The host renders a contact modal: Contact joins the landing/public nav as a button. */
  hasContact: boolean;
  contactLabel?: string;
  /** Where tokenwise.sk lives, for a host that is not tokenwise.sk (a prototype). */
  siteOrigin?: string;
}

/** tokenwise.sk's closing act, where its contact lives — how its sub-pages link back to it
 * (`?scene=9`, DocumentShell/StageShell). The contact form itself is a modal with no URL. */
const SITE_CONTACT_PATH = "/?scene=9";

export function navFor(
  variant: HeaderVariant,
  { hasContact, contactLabel = "Contact", siteOrigin }: NavOptions
): readonly NavItem[] {
  switch (variant) {
    case "landing":
    case "public":
      return hasContact ? [...PUBLIC_NAV, { label: contactLabel, action: "contact" }] : PUBLIC_NAV;
    case "dashboard":
      return DASHBOARD_NAV;
    case "admin":
      return ADMIN_NAV;
    case "prototype": {
      if (!siteOrigin) return [];
      const origin = siteOrigin.replace(/\/+$/, "");
      return [
        ...PUBLIC_NAV.map((item) => ({ ...item, href: `${origin}${item.href}` })),
        { label: contactLabel, href: `${origin}${SITE_CONTACT_PATH}` },
      ];
    }
  }
}
