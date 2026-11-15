import { test, expect } from "@playwright/test";
import { isSameSiteAuthDomain, popupFailureAction } from "../lib/sign-in-policy";
import { escapeTargets, isInAppBrowser } from "../lib/auth-browser";

/**
 * Google sign-in policy (sw-factory T-438, MUST pattern docs/factory/GOOGLE_SIGN_IN.md).
 *
 * The redirect flow only completes when Firebase's authDomain is the host that serves the
 * page: with `<project>.firebaseapp.com` on a custom domain, Chrome 115+, Firefox 109+ and
 * Safari 16.1+ return the visitor signed OUT (Firebase docs, redirect-best-practices). So a
 * blocked popup may fall back to redirect only on a same-site authDomain; elsewhere the
 * visitor taps again, which works because the login page loaded Firebase before the tap.
 */

const UA = {
  instagramIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 385.0.0.26.74 (iPhone15,3; iOS 18_5; en_US; en; scale=3.00; 1290x2796; 745673456)",
  facebookAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.135 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/492.0.0.48.107;]",
  tiktokIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_37.5.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/en Region/SK isDarkMode/1 WKWebView/1 RevealType/Dialog BytedanceWebview/d8a21c6",
  tiktokAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.135 Mobile Safari/537.36 trill_2023705040 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/37.5.4 ByteLocale/en ByteFullLocale/en Region/SK BytedanceWebview/d8a21c6",
  androidWebView:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240805.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.135 Mobile Safari/537.36",
  iosSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  iosChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  desktopChrome:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

test("closing or replacing the Google window is a cancel, never a redirect", () => {
  for (const redirectWorks of [true, false]) {
    expect(popupFailureAction("auth/popup-closed-by-user", redirectWorks)).toBe("ignore");
    expect(popupFailureAction("auth/cancelled-popup-request", redirectWorks)).toBe("ignore");
  }
});

test("a blocked popup falls back to redirect only where the redirect can complete", () => {
  expect(popupFailureAction("auth/popup-blocked", true)).toBe("redirect");
  expect(popupFailureAction("auth/popup-blocked", false)).toBe("retry");
  expect(popupFailureAction("auth/operation-not-supported-in-this-environment", true)).toBe("redirect");
  expect(popupFailureAction("auth/operation-not-supported-in-this-environment", false)).toBe("error");
});

test("every other failure is an error the visitor sees", () => {
  expect(popupFailureAction("auth/network-request-failed", true)).toBe("error");
  expect(popupFailureAction("auth/unauthorized-domain", false)).toBe("error");
  expect(popupFailureAction(undefined, true)).toBe("error");
});

test("the authDomain serves this page only when it is this page's own host", () => {
  expect(isSameSiteAuthDomain("apps.tokenwise.sk", "apps.tokenwise.sk")).toBe(true);
  expect(isSameSiteAuthDomain("Apps.Tokenwise.sk", "apps.tokenwise.sk")).toBe(true);
  expect(isSameSiteAuthDomain("sw-factory-d4ac5.firebaseapp.com", "apps.tokenwise.sk")).toBe(false);
  expect(isSameSiteAuthDomain("tokenwise.sk", "apps.tokenwise.sk")).toBe(false);
  expect(isSameSiteAuthDomain(undefined, "localhost")).toBe(false);
  expect(isSameSiteAuthDomain("", "localhost")).toBe(false);
});

test("social apps' built-in browsers are recognised — TikTok and any Android WebView included", () => {
  for (const [name, ua] of Object.entries({
    instagramIos: UA.instagramIos,
    facebookAndroid: UA.facebookAndroid,
    tiktokIos: UA.tiktokIos,
    tiktokAndroid: UA.tiktokAndroid,
    androidWebView: UA.androidWebView,
  })) {
    expect(isInAppBrowser(ua), name).toBe(true);
  }
});

test("real browsers are never mistaken for a built-in one", () => {
  for (const [name, ua] of Object.entries({
    iosSafari: UA.iosSafari,
    iosChrome: UA.iosChrome,
    androidChrome: UA.androidChrome,
    desktopChrome: UA.desktopChrome,
  })) {
    expect(isInAppBrowser(ua), name).toBe(false);
  }
});

test("the Android escape opens Chrome and falls back to the same page, never an error page", () => {
  const url = "https://apps.tokenwise.sk/newapp/x/login?startLogin=1";
  const targets = escapeTargets(url, UA.facebookAndroid);
  expect(targets).toEqual([
    "intent://apps.tokenwise.sk/newapp/x/login?startLogin=1#Intent;scheme=https;package=com.android.chrome;" +
      `S.browser_fallback_url=${encodeURIComponent(url)};end`,
  ]);
});

test("the iOS escape asks Safari first by the scheme its version understands", () => {
  const url = "https://apps.tokenwise.sk/newapp/x/login?startLogin=1";
  expect(escapeTargets(url, UA.instagramIos)).toEqual([
    "x-safari-https://apps.tokenwise.sk/newapp/x/login?startLogin=1",
    `com-apple-mobilesafari-tab:${url}`,
  ]);
  const ios16 = UA.instagramIos.replace(/18_5/g, "16_7");
  expect(escapeTargets(url, ios16)).toEqual([
    `com-apple-mobilesafari-tab:${url}`,
    "x-safari-https://apps.tokenwise.sk/newapp/x/login?startLogin=1",
  ]);
});

test("a desktop browser has nowhere to escape to", () => {
  expect(escapeTargets("https://example.test/login", UA.desktopChrome)).toEqual([]);
});
