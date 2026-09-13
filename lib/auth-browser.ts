"use client";

/**
 * In-app browser detection and escape utilities.
 *
 * Social apps (Facebook, Instagram, TikTok, etc.) open links in their embedded WebView
 * which does NOT support OAuth popup/redirect flows. This module detects such browsers
 * and attempts to escape to the system browser (Safari on iOS, Chrome on Android).
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
];

export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return IN_APP_PATTERNS.some((p) => ua.includes(p));
}

export function getInAppBrowserName(): string {
  if (typeof navigator === "undefined") return "";
  const ua = navigator.userAgent || "";

  if (ua.includes("Messenger") || ua.includes("FBAN")) return "Messenger";
  if (ua.includes("Instagram")) return "Instagram";
  if (ua.includes("WhatsApp")) return "WhatsApp";
  if (ua.includes("FBAV") || ua.includes("FB_IAB")) return "Facebook";
  if (ua.includes("Line/")) return "Line";
  if (ua.includes("MicroMessenger")) return "WeChat";
  if (ua.includes("Snapchat")) return "Snapchat";
  if (ua.includes("Twitter")) return "Twitter";
  if (ua.includes("LinkedInApp")) return "LinkedIn";
  if (ua.includes("Pinterest")) return "Pinterest";
  if (ua.includes("TikTok")) return "TikTok";
  return "";
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/i.test(navigator.userAgent || "");
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

function getIOSVersion(): number {
  const match = (navigator.userAgent || "").match(/OS (\d+)_/);
  return match ? parseInt(match[1], 10) : 0;
}

function getLoginUrl(): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.set("startLogin", "1");
  return url.toString();
}

/**
 * Attempt to escape in-app browser to system browser.
 * Returns true if escape was attempted (page will navigate away).
 */
export function escapeInAppBrowser(): boolean {
  if (typeof window === "undefined") return false;

  const loginUrl = getLoginUrl();

  if (isIOS()) {
    const iosVersion = getIOSVersion();
    const urlWithoutScheme = loginUrl.replace(/^https?:\/\//, "");
    const primaryUrl =
      iosVersion >= 17
        ? `x-safari-https://${urlWithoutScheme}`
        : `com-apple-mobilesafari-tab:${loginUrl}`;
    const fallbackUrl =
      iosVersion >= 17
        ? `com-apple-mobilesafari-tab:${loginUrl}`
        : `x-safari-https://${urlWithoutScheme}`;

    window.location.href = primaryUrl;
    window.setTimeout(() => {
      window.location.href = fallbackUrl;
    }, 700);
    return true;
  }

  if (isAndroid()) {
    const urlWithoutScheme = loginUrl.replace(/^https?:\/\//, "");
    window.location.href = `intent://${urlWithoutScheme}#Intent;scheme=https;package=com.android.chrome;end`;
    return true;
  }

  return false;
}

export function hasStartLoginParam(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("startLogin") === "1";
}

export function clearStartLoginParam(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  let changed = false;
  if (url.searchParams.has("startLogin")) {
    url.searchParams.delete("startLogin");
    changed = true;
  }
  if (changed) {
    const clean =
      url.pathname +
      (url.searchParams.toString() ? "?" + url.searchParams.toString() : "") +
      url.hash;
    window.history.replaceState({}, "", clean);
  }
}
