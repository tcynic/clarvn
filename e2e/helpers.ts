import type { Page } from "@playwright/test";

export const TEST_EMAIL = "e2e@clarvn.test";
export const TEST_PASSWORD = "E2eTestPass123!";

/**
 * Signs up or signs in a test user via the /login page.
 * Must be called before navigating to protected routes.
 */
export async function ensureSignedIn(page: Page) {
  await page.goto("/login");

  // Switch to Create Account mode and attempt sign-up (idempotent — fails
  // gracefully if the account already exists, then falls back to sign-in).
  await page.getByRole("button", { name: "Create Account" }).first().click();
  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create Account" }).last().click();

  const result = await Promise.race([
    page.waitForURL(/\/(app|onboarding|home)/, { timeout: 6000 }).then(() => "ok"),
    page.waitForSelector("text=Could not create account", { timeout: 6000 }).then(() => "exists"),
  ]).catch(() => "timeout");

  if (result !== "ok") {
    // Account already exists — sign in instead.
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign In" }).first().click();
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).last().click();
    await page.waitForURL(/\/(app|onboarding|home)/, { timeout: 8000 });
  }
}

/**
 * Sets a completed onboarding profile in localStorage before page load.
 * Must be called before page.goto().
 */
export async function setProfile(
  page: Page,
  conditions: string[] = [],
  sensitivities: string[] = []
) {
  await page.addInitScript((profile) => {
    localStorage.setItem("clarvn_profile", JSON.stringify(profile));
  }, { motivation: ["General curiosity"], conditions, sensitivities });
}

/**
 * Clears the profile so the onboarding redirect fires.
 * Must be called before page.goto().
 */
export async function clearProfile(page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem("clarvn_profile");
  });
}

/**
 * Sets onboarding draft + step in localStorage before page load.
 * Must be called before page.goto().
 */
export async function setOnboardingDraft(
  page: Page,
  draft: Record<string, unknown>,
  step: number = 0
) {
  await page.addInitScript(
    ({ d, s }) => {
      localStorage.setItem("clarvn_onboarding_profile", JSON.stringify(d));
      localStorage.setItem("clarvn_onboarding_step", JSON.stringify(s));
    },
    { d: draft, s: step }
  );
}

/**
 * Clears all onboarding localStorage keys before page load.
 * Must be called before page.goto().
 */
export async function clearOnboardingData(page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem("clarvn_onboarding_profile");
    localStorage.removeItem("clarvn_onboarding_step");
    localStorage.removeItem("clarvn_profile");
  });
}
