import type { Page } from "@playwright/test";

export const TEST_EMAIL = "e2e@clarvn.test";
export const TEST_PASSWORD = "E2eTestPass123!";

/**
 * Signs up or signs in a test user via the /login page.
 * If onboarding hasn't been completed, walks through it automatically.
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

  // Complete onboarding if redirected there
  if (page.url().includes("/onboarding")) {
    await completeOnboarding(page);
  }
}

/**
 * Walks through all 7 onboarding steps using the minimal valid selections,
 * ending at /home with a profile saved in localStorage.
 */
async function completeOnboarding(page: Page) {
  // Step 0: Motivation — at least one chip required before Continue enables
  await page.getByRole("button", { name: "Just curious" }).waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: "Just curious" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  // Step 1: Conditions
  await page.getByRole("button", { name: "None of these" }).waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: "None of these" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  // Step 2: Sensitivities
  await page.getByRole("button", { name: "None of these" }).waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: "None of these" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  // Step 3: Dietary restrictions
  await page.getByRole("button", { name: "No restrictions" }).waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: "No restrictions" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  // Step 4: Household — requires a selection before Continue enables
  await page.getByRole("button", { name: "Just me" }).waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: "Just me" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  // Step 5: Ingredients to flag — has Skip
  await page.getByRole("button", { name: "Skip" }).waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: "Skip" }).click();
  // Step 6: Value preview — "Explore without an account" saves profile to localStorage
  await page.getByRole("button", { name: "Explore without an account" }).waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: "Explore without an account" }).click();
  await page.waitForURL(/\/home/, { timeout: 8000 });
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
