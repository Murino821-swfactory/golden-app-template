import { test, expect, type Page } from "@playwright/test";
import { config } from "../lib/prototype-config";
import { uiCopy } from "./ui-copy";

/**
 * Google sign-in in the browser (sw-factory T-438, MUST pattern docs/factory/GOOGLE_SIGN_IN.md).
 *
 * Browsers open a popup only inside the tap that asked for it. On phones and in Safari the
 * Firebase Auth SDK also prepares its sign-in iframe when Auth starts, not at the tap. So the
 * login page has to have Firebase Auth loaded BEFORE the first tap: loading ~700 kB after it
 * got the popup blocked on slow connections, and the redirect fallback could not complete.
 */

// An AuthEventType string that exists only inside the Firebase Auth SDK, never in our code.
const FIREBASE_AUTH_MARKER = "signInViaPopup";

function watchFirebaseAuthDownload(page: Page) {
  const seen = { firebaseAuth: false };
  page.on("response", async (response) => {
    if (!/\.js(\?|$)/.test(response.url())) return;
    try {
      if ((await response.text()).includes(FIREBASE_AUTH_MARKER)) seen.firebaseAuth = true;
    } catch {
      // A body that is gone (navigation) is not the one we are looking for.
    }
  });
  return seen;
}

const signInButton = (page: Page) =>
  page.getByRole("button", { name: uiCopy.auth.signInButton!, exact: true });

test("the login page has Firebase Auth loaded before the first tap", async ({ page }) => {
  test.skip(!config.patterns.authGoogle, "authGoogle pattern not enabled in this config");
  const seen = watchFirebaseAuthDownload(page);
  await page.goto("./login");
  await expect(signInButton(page)).toBeVisible();
  await expect.poll(() => seen.firebaseAuth, { timeout: 15_000 }).toBe(true);
});

test("an anonymous visitor's landing page still never downloads Firebase Auth", async ({ page }) => {
  test.skip(!config.patterns.landing, "landing pattern not enabled in this config");
  const seen = watchFirebaseAuthDownload(page);
  await page.goto("./");
  await page.waitForLoadState("load");
  await page.waitForTimeout(1_500);
  expect(seen.firebaseAuth).toBe(false);
});

test.describe("inside a social app's built-in browser", () => {
  test.use({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 385.0.0.26.74 (iPhone15,3; iOS 18_5; en_US; en; scale=3.00; 1290x2796; 745673456)",
  });

  test("the sign-in tap explains how to continue instead of bouncing through the dashboard", async ({ page }) => {
    test.skip(!config.patterns.authGoogle, "authGoogle pattern not enabled in this config");
    const visited: string[] = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) visited.push(new URL(frame.url()).pathname);
    });
    await page.goto("./login");
    await signInButton(page).click();
    await page.waitForTimeout(1_500);
    // The escape to Safari is a request the app may ignore; treating it as a finished sign-in
    // sent the visitor to /dashboard and straight back to /login, with no word of what happened.
    expect(visited.filter((path) => /\/dashboard\/?$/.test(path))).toEqual([]);
    await expect(page.getByRole("status")).toContainText(uiCopy.auth.inAppEscaping!);
  });

  test("the page says up front that sign-in needs a real browser and offers the link", async ({ page }) => {
    test.skip(!config.patterns.authGoogle, "authGoogle pattern not enabled in this config");
    await page.goto("./login");
    await expect(page.getByText(uiCopy.auth.inAppTitle!, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: uiCopy.auth.inAppCopy!, exact: true })).toBeVisible();
  });
});
