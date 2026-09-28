/**
 * The nav of each tokenwise.sk variant — here, not in the host, so the site's nav exists in
 * one place. The desktop row and the mobile menu both read `navFor`, so the two can never
 * drift apart. A prototype has no nav: two or three routes do not need a menu.
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

export function navFor(
  variant: HeaderVariant,
  hasContact: boolean,
  contactLabel = "Contact"
): readonly NavItem[] {
  switch (variant) {
    case "landing":
    case "public":
      return hasContact ? [...PUBLIC_NAV, { label: contactLabel, action: "contact" }] : PUBLIC_NAV;
    case "dashboard":
      return DASHBOARD_NAV;
    case "admin":
      return ADMIN_NAV;
    case "prototype":
      return [];
  }
}
