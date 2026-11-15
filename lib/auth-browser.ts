"use client";

/**
 * In-app browser detection and escape utilities.
 *
 * Social apps (Facebook, Instagram, TikTok, etc.) open links in their embedded WebView, and
 * Google refuses to sign anyone in there (403 disallowed_useragent). This module detects
 * such browsers and asks the phone to reopen the page in its real browser (Safari on iOS,
 * Chrome on Android). The app may ignore the request, so the login page always explains how
 * to continue by hand (sw-factory `docs/factory/GOOGLE_SIGN_IN.md`, T-438).
 *
 * The UA functions take the user agent as a parameter so they stay pure and testable
 * (`tests/sign-in-policy.spec.ts`); in the browser they default to `navigator.userAgent`.
 */

const IN_APP_PATTERNS = [
  "FBAN",
  "FBAV",
  "FB_IAB",
  "FBIOS",
  "Messenger",
  "Instagram",
  "WhatsApp",
  "Line/",
  "MicroMessenger",
  "Snapchat",
  "Twitter",
  "LinkedInApp",
  "Pinterest",
  "TikTok",
  // TikTok's own browser never says "TikTok": it is musical_ly on iOS, trill on Android, and
  // BytedanceWebview on both.
  "musical_ly",
  "BytedanceWebview",
];

/** Every Android WebView says `; wv)`. Google blocks OAuth in all of them, so all count. */
const ANDROID_WEBVIEW = /Android[^)]*; wv\)/;

function currentUserAgent(): string {
  if (typeof navigator === "undefined") return "";
  return navigator.userAgent || "";
}

export function isInAppBrowser(ua: string = currentUserAgent()): boolean {
  return IN_APP_PATTERNS.some((p) => ua.includes(p)) || ANDROID_WEBVIEW.test(ua);
}

export function getInAppBrowserName(ua: string = currentUserAgent()): string {
  if (ua.includes("Messenger") || ua.includes("FBAN")) return "Messenger";
  if (ua.includes("Instagram")) return "Instagram";
  if (ua.includes("WhatsApp")) return "WhatsApp";
  if (ua.includes("FBAV") || ua.includes("FB_IAB")) return "Facebook";
  if (ua.includes("musical_ly") || ua.includes("BytedanceWebview") || ua.includes("TikTok")) return "TikTok";
  if (ua.includes("Line/")) return "Line";
  if (ua.includes("MicroMessenger")) return "WeChat";
  if (ua.includes("Snapchat")) return "Snapchat";
  if (ua.includes("Twitter")) return "Twitter";
  if (ua.includes("LinkedInApp")) return "LinkedIn";
  if (ua.includes("Pinterest")) return "Pinterest";
  return "";
}

const isIOS = (ua: string) => /iPad|iPhone|iPod/i.test(ua);
const isAndroid = (ua: string) => /Android/i.test(ua);

function iosMajorVersion(ua: string): number {
  const match = ua.match(/OS (\d+)_/);
  return match ? parseInt(match[1], 10) : 0;
}

/** This page with `?startLogin=1` — what the real browser should open. */
export function getLoginUrl(): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.set("startLogin", "1");
  return url.toString();
}

/**
 * Where to send the visitor to leave the built-in browser, in the order to try; empty when
 * there is nowhere to go (a desktop). On Android, Chrome's `browser_fallback_url` keeps a
 * phone without Chrome on this same page instead of an "app not found" error. Pure.
 */
export function escapeTargets(loginUrl: string, ua: string): string[] {
  const withoutScheme = loginUrl.replace(/^https?:\/\//, "");
  if (isIOS(ua)) {
    const safariHttps = `x-safari-https://${withoutScheme}`;
    const safariTab = `com-apple-mobilesafari-tab:${loginUrl}`;
    // iOS 17 introduced x-safari-https; older versions understand only the tab scheme.
    return iosMajorVersion(ua) >= 17 ? [safariHttps, safariTab] : [safariTab, safariHttps];
  }
  if (isAndroid(ua)) {
    return [
      `intent://${withoutScheme}#Intent;scheme=https;package=com.android.chrome;` +
        `S.browser_fallback_url=${encodeURIComponent(loginUrl)};end`,
    ];
  }
  return [];
}

/**
 * Ask the phone to reopen this page in its real browser.
 * Returns true if a request was made — NOT that it worked: the app may ignore it.
 */
export function escapeInAppBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const [primary, fallback] = escapeTargets(getLoginUrl(), currentUserAgent());
  if (!primary) return false;
  window.location.href = primary;
  if (fallback) {
    window.setTimeout(() => {
      window.location.href = fallback;
    }, 700);
  }
  return true;
}

export function hasStartLoginParam(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("startLogin") === "1";
}

export function clearStartLoginParam(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("startLogin")) return;
  url.searchParams.delete("startLogin");
  const clean =
    url.pathname +
    (url.searchParams.toString() ? "?" + url.searchParams.toString() : "") +
    url.hash;
  window.history.replaceState(window.history.state, "", clean);
}
