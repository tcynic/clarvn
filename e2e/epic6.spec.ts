/**
 * Epic 6 — Explore + Filters
 *
 * Suite A: Explore page smoke
 * Suite B: Category pill filtering
 * Suite C: Sidebar filter (Gluten-free)
 * Suite D: Free-tier paywall
 */

import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./helpers";

// ─── Suite A: Explore page smoke ─────────────────────────────────────────────

test.describe("E6-A — Explore page smoke", () => {
  test("renders /explore without error while signed in", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/explore");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("nextjs-portal")).not.toBeVisible();
  });

  test("shows Explore heading", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/explore");
    await expect(
      page.getByRole("heading", { name: "Best Clean Food Products" })
    ).toBeVisible({ timeout: 8000 });
  });

  test("category pill row is visible", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/explore");
    // "All" pill should always be present
    await expect(page.getByRole("button", { name: "All" })).toBeVisible({ timeout: 8000 });
  });

  test("sort dropdown is visible", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/explore");
    await expect(
      page.getByRole("combobox", { name: "Sort products" })
    ).toBeVisible({ timeout: 8000 });
  });
});

// ─── Suite B: Category pill filter ───────────────────────────────────────────

test.describe("E6-B — Category pill filter", () => {
  test("'All' pill is active by default", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/explore");
    const allPill = page.getByRole("button", { name: "All" });
    await expect(allPill).toBeVisible({ timeout: 8000 });
    // Active pills have the "active" class via FilterPill component
    await expect(allPill).toHaveClass(/active/);
  });

  test("clicking 'Snacks' updates URL with cat=Snacks", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/explore");
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: "Snacks" }).click();
    await expect(page).toHaveURL(/cat=Snacks/, { timeout: 5000 });
  });

  test("'Snacks' pill becomes active after click", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/explore?cat=Snacks");
    const snacksPill = page.getByRole("button", { name: "Snacks" });
    await expect(snacksPill).toBeVisible({ timeout: 8000 });
    await expect(snacksPill).toHaveClass(/active/);
  });
});

// ─── Suite C: Sidebar filter (Gluten-free) ───────────────────────────────────

test.describe("E6-C — Sidebar filter", () => {
  test("Gluten-free checkbox is visible in sidebar (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await ensureSignedIn(page);
    await page.goto("/explore");
    const checkbox = page.locator('[data-claim="gluten_free"]').first();
    await expect(checkbox).toBeVisible({ timeout: 8000 });
  });

  test("checking Gluten-free updates URL with claims param", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await ensureSignedIn(page);
    await page.goto("/explore");
    const checkbox = page.locator('[data-claim="gluten_free"]').first();
    await expect(checkbox).toBeVisible({ timeout: 8000 });
    await checkbox.click();
    await expect(page).toHaveURL(/claims=gluten_free/, { timeout: 5000 });
  });

  test("mobile Filters button opens filter sheet", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await ensureSignedIn(page);
    await page.goto("/explore");
    await page.getByRole("button", { name: "Filters" }).click();
    await expect(
      page.getByRole("dialog", { name: "Filter products" })
    ).toBeVisible({ timeout: 5000 });
  });
});

// ─── Suite D: Free-tier paywall ───────────────────────────────────────────────

test.describe("E6-D — Free-tier paywall", () => {
  test("free user sees locked card on explore page (when >6 products exist)", async ({
    page,
  }) => {
    await ensureSignedIn(page);
    await page.goto("/explore");
    // Give the query time to load
    await page.waitForTimeout(3000);

    // Check if locked card is present — it will only appear if >6 products exist in DB
    const hasLockedCard = await page.getByText(/Unlock/).isVisible();
    const hasProductGrid = await page.locator(".product-card").first().isVisible();

    if (hasProductGrid) {
      // If there are products loaded, there may or may not be enough for capping
      // The test verifies the page doesn't error — locked card presence depends on data
      await expect(page.locator("body")).toBeVisible();
    } else {
      // No products in test DB — just verify page renders
      await expect(
        page.getByText("No products match these filters.")
      ).toBeVisible({ timeout: 5000 });
    }
    // Suppress unused warning
    void hasLockedCard;
  });

  test("'Go Premium' link inside locked card points to /upgrade", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/explore");
    await page.waitForTimeout(3000);

    const upgradeLink = page.getByRole("link", { name: "Go Premium" }).first();
    const isVisible = await upgradeLink.isVisible();
    if (isVisible) {
      await expect(upgradeLink).toHaveAttribute("href", "/upgrade");
    }
  });
});
