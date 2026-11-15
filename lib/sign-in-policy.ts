/**
 * Google sign-in policy — pure and browser-free (`tests/sign-in-policy.spec.ts`).
 * The MUST pattern it implements: sw-factory `docs/factory/GOOGLE_SIGN_IN.md` (T-438).
 */

/** What `signInWithGoogle()` reports to the page that asked. */
export type SignInOutcome =
  /** The Google window finished; `user` is set. */
  | "signed-in"
  /** The page is leaving for Google (redirect flow); it comes back signed in. */
  | "redirecting"
  /** Asked the phone to reopen the page in Safari/Chrome. The app may ignore it, so say so. */
  | "escaping"
  /** The visitor closed the Google window. Nothing to show. */
  | "cancelled"
  /** The browser blocked the window. Firebase is loaded by now, so a second tap opens it. */
  | "popup-blocked";

export type PopupFailureAction = "ignore" | "redirect" | "retry" | "error";

/**
 * Does Firebase's `authDomain` serve this very page? Only then can the redirect flow complete:
 * with `<project>.firebaseapp.com` on a custom domain, Chrome 115+, Firefox 109+ and
 * Safari 16.1+ partition the SDK's cross-site iframe storage and the visitor comes back
 * signed OUT (Firebase docs, "Best practices for using signInWithRedirect").
 */
export function isSameSiteAuthDomain(authDomain: string | undefined, hostname: string): boolean {
  return Boolean(authDomain) && authDomain!.toLowerCase() === hostname.toLowerCase();
}

/** What to do when `signInWithPopup` fails with `code`. */
export function popupFailureAction(code: string | undefined, redirectWorks: boolean): PopupFailureAction {
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "ignore";
    case "auth/popup-blocked":
      return redirectWorks ? "redirect" : "retry";
    case "auth/operation-not-supported-in-this-environment":
      return redirectWorks ? "redirect" : "error";
    default:
      return "error";
  }
}
