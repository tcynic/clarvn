/**
 * Sprint 2 Regression (R2)
 *
 * Suite A: Onboarding → value preview critical path (new 6-screen chip flow)
 * Suite B: Sprint 1 route regression carry-forward
 * Suite C: Guest path — localStorage profile + GuestBanner
 * Suite D: user_profiles verification after signup
 * Suite E: Mid-onboarding resumption
 */

import { test, expect } from "@playwright/test";
import {
  ensureSignedIn,
  setProfile,
  clearProfile,
  setOnboardingDraft,
  clearOnboardingData,
} from "./helpers";

// ─── Suite A: Onboarding critical path ──────────────────────────────────────

test.describe("R2-A — Onboarding chip flow critical path", () => {
  test("completes all 6 screens and reaches value preview", async ({ page }) => {
    await clearOnboardingData(page);
    await page.goto("/onboarding");

    // Step 1 — Motivation
    await expect(page.getByText("What brings you to Clarvn?")).toBeVisible({ timeout: 8000 });
    await page.getByText("General health & wellness").click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2 — Conditions
    await expect(page.getByText("Do any of these apply to you?")).toBeVisible({ timeout: 5000 });
    await page.getByText("ADHD").click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3 — Sensitivities
    await expect(page.getByText("Any sensitivities?")).toBeVisible({ timeout: 5000 });
    await page.getByText("Migraines").click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 4 — Dietary
    await expect(page.getByText("Any dietary restrictions?")).toBeVisible({ timeout: 5000 });
    await page.getByText("Gluten-free").click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 5 — Household
    await expect(page.getByText("Who are you shopping for?")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /Just me/ }).click();
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled({ timeout: 5000 });
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 6 — Ingredients to flag (skip)
    await expect(page.getByText("Any specific ingredients to flag?")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Skip" }).click();

    // Value preview
    await expect(page.getByText("Your profile is ready")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "Create your free account" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Explore without an account" })).toBeVisible();
  });

  test("clicking 'Create your free account' redirects to /login?from=onboarding", async ({ page }) => {
    await clearOnboardingData(page);
    await page.goto("/onboarding");

    // Fast-path: set draft directly at step 6 (value preview)
    await clearOnboardingData(page);
    await setOnboardingDraft(
      page,
      {
        motivation: ["General health & wellness"],
        conditions: ["ADHD"],
        sensitivities: ["Migraines"],
        dietaryRestrictions: ["Gluten-free"],
        lifeStage: "just_me",
        householdMembers: [],
        ingredientsToAvoid: [],
      },
      6
    );
    await page.goto("/onboarding");

    await expect(page.getByRole("button", { name: "Create your free account" })).toBeVisible({ timeout: 8000 });
    await page.getByRole("button", { name: "Create your free account" }).click();
    await page.waitForURL("**/login?from=onboarding", { timeout: 8000 });
  });
});

// ─── Suite B: Sprint 1 route regression ─────────────────────────────────────

test.describe("R2-B — Sprint 1 route regression carry-forward", () => {
  test("/ loads without error", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("nextjs-portal")).not.toBeVisible();
  });

  test("/onboarding loads without error", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("nextjs-portal")).not.toBeVisible();
  });

  test("/admin redirects to /admin/login when unauthenticated", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL("**/admin/login", { timeout: 8000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("/home with profile shows home page without error", async ({ page }) => {
    await setProfile(page, ["ADHD"], []);
    await page.goto("/home");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("nextjs-portal")).not.toBeVisible();
  });
});

// ─── Suite C: Guest path ─────────────────────────────────────────────────────

test.describe("R2-C — Guest path", () => {
  test("'Explore without an account' saves profile and navigates to /home", async ({ page }) => {
    await clearOnboardingData(page);
    await setOnboardingDraft(
      page,
      {
        motivation: ["Just curious"],
        conditions: ["ADHD"],
        sensitivities: [],
        dietaryRestrictions: [],
        lifeStage: "just_me",
        householdMembers: [],
        ingredientsToAvoid: [],
      },
      6
    );
    await page.goto("/onboarding");

    await expect(page.getByRole("button", { name: "Explore without an account" })).toBeVisible({ timeout: 8000 });
    await page.getByRole("button", { name: "Explore without an account" }).click();
    await page.waitForURL("**/home", { timeout: 8000 });

    // localStorage must have clarvn_profile with conditions
    const profile = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("clarvn_profile") ?? "null")
    );
    expect(profile).not.toBeNull();
    expect(profile.conditions).toContain("ADHD");
  });

  test("/home as guest shows GuestBanner", async ({ page }) => {
    await setProfile(page, ["ADHD"], []);
    await page.goto("/home");
    await expect(page.getByText("You're exploring as a guest")).toBeVisible({ timeout: 8000 });
  });

  test("/home as guest loads without auth redirect", async ({ page }) => {
    await setProfile(page, [], []);
    await page.goto("/home");
    // Should stay on /home, not redirected to /onboarding
    await expect(page).toHaveURL(/\/home/, { timeout: 8000 });
    await expect(page.locator("nextjs-portal")).not.toBeVisible();
  });
});

// ─── Suite D: user_profiles verification after signup ───────────────────────

test.describe("R2-D — Profile persists after signup", () => {
  test("home page loads without redirecting back to onboarding after sign-in", async ({ page }) => {
    await ensureSignedIn(page);
    // After sign-in with profile set, home should not loop back to onboarding
    await setProfile(page, ["ADHD"], ["Migraines"]);
    await page.goto("/home");
    // Should stay on /home (profile exists — no redirect trigger)
    await expect(page).toHaveURL(/\/home/, { timeout: 8000 });
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("nextjs-portal")).not.toBeVisible();
  });
});

// ─── Suite E: Mid-onboarding resumption ─────────────────────────────────────

test.describe("R2-E — Mid-onboarding resumption", () => {
  test("resumes at correct step after navigating away and back", async ({ page }) => {
    // Simulate completing steps 0-3 (step index 3 = dietary restrictions)
    await setOnboardingDraft(
      page,
      {
        motivation: ["General health & wellness"],
        conditions: ["ADHD"],
        sensitivities: ["Migraines"],
      },
      3
    );
    await page.goto("/onboarding");

    // Should show step 4 (dietary restrictions), not step 1 (motivation)
    await expect(page.getByText("Any dietary restrictions?")).toBeVisible({ timeout: 8000 });
    // Should NOT show the motivation screen
    await expect(page.getByText("What brings you to Clarvn?")).not.toBeVisible();
  });
});
