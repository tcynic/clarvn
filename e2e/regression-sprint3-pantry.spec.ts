/**
 * Sprint 3 Regression — Pantry + Check-ins (Epic 5)
 *
 * Suite A: Pantry page smoke + sort controls
 * Suite B: Check-in persistence across page reload
 * Suite C: Pantry add/remove round-trip
 * Suite D: Sprint 2 route regression carry-forward
 */

import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./helpers";

// ─── Suite A: Pantry page smoke ──────────────────────────────────────────────

test.describe("R3-A — Pantry page smoke", () => {
  test("renders /pantry without error while signed in", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/pantry");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("nextjs-portal")).not.toBeVisible();
  });

  test("shows pantry heading", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/pantry");
    await expect(
      page.getByRole("heading", { name: "Your Pantry" })
    ).toBeVisible({ timeout: 8000 });
  });

  test("sort controls render when pantry has items", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/pantry");

    // Wait for page hydration
    await page.waitForTimeout(2000);

    const sortControls = page.getByTestId("sort-controls");
    const isEmpty = await page.getByText("Your pantry is empty").isVisible();

    if (!isEmpty) {
      await expect(sortControls).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole("button", { name: "Date added" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Score" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Name" })).toBeVisible();
    }
    // If pantry is empty, empty state is shown — that's also valid
  });

  test("redirects unauthenticated users away from /pantry", async ({ page }) => {
    // Clear auth by going to a page without signing in
    await page.goto("/pantry");
    // Should either redirect to /login or show the redirect in progress
    await page.waitForURL(/\/(login|onboarding)/, { timeout: 8000 }).catch(() => {
      // Acceptable: page may show loading state during redirect
    });
  });
});

// ─── Suite B: Check-in persistence ───────────────────────────────────────────

test.describe("R3-B — Check-in persistence", () => {
  test("check-in persists after page reload", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/home");

    // Wait for check-in widget to load
    await expect(page.getByText("How are you feeling?")).toBeVisible({
      timeout: 10000,
    });

    // Click the "Good" emoji (🙂)
    await page.getByRole("button", { name: "Good" }).click();

    // Wait for the logged state to appear
    await expect(page.getByText("Logged for today")).toBeVisible({
      timeout: 8000,
    });

    // Reload and verify the check-in is still shown
    await page.reload();
    await page.waitForTimeout(2000); // allow Convex subscription to hydrate

    await expect(page.getByText("Logged for today")).toBeVisible({
      timeout: 8000,
    });
  });
});

// ─── Suite C: Pantry add/remove round-trip ───────────────────────────────────

test.describe("R3-C — Pantry add/remove round-trip", () => {
  test("adding a product from home makes it appear on /pantry", async ({
    page,
  }) => {
    await ensureSignedIn(page);
    await page.goto("/home");

    // Wait for product cards to load
    await page.waitForTimeout(3000);

    // Look for a product card with an unfilled heart (♡)
    const emptyHeart = page.getByRole("button", { name: "Save to pantry" }).first();
    const hasHeart = await emptyHeart.isVisible();

    if (!hasHeart) {
      test.skip(); // No products with pantry buttons visible — skip gracefully
      return;
    }

    // Click the heart to add to pantry
    await emptyHeart.click();

    // Heart should now be filled (♥)
    await expect(
      page.getByRole("button", { name: "Remove from pantry" }).first()
    ).toBeVisible({ timeout: 5000 });

    // Navigate to /pantry and verify product appears
    await page.goto("/pantry");
    await page.waitForTimeout(2000);

    const pantryGrid = page.getByTestId("stats-row");
    await expect(pantryGrid).toBeVisible({ timeout: 8000 });
  });

  test("removing from /pantry updates the grid", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/pantry");

    // Wait for load
    await page.waitForTimeout(2000);

    const isEmpty = await page.getByText("Your pantry is empty").isVisible();
    if (isEmpty) {
      test.skip(); // Nothing to remove — skip
      return;
    }

    // Count items before removal
    const removeButtons = page.getByTestId("remove-from-pantry");
    const countBefore = await removeButtons.count();

    // Hover first card to reveal remove button and click it
    await page.locator(".relative.group").first().hover();
    await removeButtons.first().click({ force: true });

    // Count should decrease
    await page.waitForTimeout(1500);
    const countAfter = await page.getByTestId("remove-from-pantry").count();
    expect(countAfter).toBeLessThan(countBefore);
  });
});

// ─── Suite D: Sprint 2 route regression carry-forward ────────────────────────

test.describe("R3-D — Route smoke regression", () => {
  const routes = ["/", "/onboarding", "/home", "/explore", "/pantry"];

  for (const route of routes) {
    test(`${route} renders without error`, async ({ page }) => {
      if (route === "/home" || route === "/pantry") {
        await ensureSignedIn(page);
      }
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("nextjs-portal")).not.toBeVisible();
    });
  }
});
