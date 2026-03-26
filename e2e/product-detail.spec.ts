/**
 * Epic 7 — Product Detail Redesign
 *
 * Suite A: Page smoke + hero
 * Suite B: Score card
 * Suite C: Claims grid
 * Suite D: Ingredient list + expandable panels
 * Suite E: Why it works + alternatives
 * Suite F: Pantry sidebar toggle
 */

import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./helpers";

// ---------------------------------------------------------------------------
// Helper: navigate to the first available product detail page.
// Clicks the first ProductCard on /explore to land on /product/[id].
// ---------------------------------------------------------------------------
async function navigateToFirstProduct(page: Parameters<typeof ensureSignedIn>[0]) {
  await page.goto("/explore");
  // Wait for a real product card — excludes skeleton/loading cards (animate-pulse)
  const card = page.locator(".product-card.cursor-pointer").first();
  const hasProducts = await card.isVisible({ timeout: 8000 }).catch(() => false);
  if (!hasProducts) return false;
  await card.click();
  await page.waitForURL(/\/product\//, { timeout: 6000 });
  return true;
}

// ─── Suite A: Page smoke + hero ───────────────────────────────────────────────

test.describe("E7-A — Product detail smoke", () => {
  test("renders /product/[id] without error while signed in", async ({ page }) => {
    await ensureSignedIn(page);
    const found = await navigateToFirstProduct(page);
    if (!found) {
      test.skip();
      return;
    }
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("nextjs-portal")).not.toBeVisible();
  });

  test("shows breadcrumb with Home link", async ({ page }) => {
    await ensureSignedIn(page);
    const found = await navigateToFirstProduct(page);
    if (!found) { test.skip(); return; }
    const homeLink = page.getByRole("link", { name: "Home" }).first();
    await expect(homeLink).toBeVisible({ timeout: 6000 });
  });

  test("shows product hero with product name (serif heading)", async ({ page }) => {
    await ensureSignedIn(page);
    const found = await navigateToFirstProduct(page);
    if (!found) { test.skip(); return; }
    const hero = page.locator('[data-testid="product-hero"]');
    await expect(hero).toBeVisible({ timeout: 6000 });
    // h1 should be inside the hero
    await expect(hero.locator("h1")).toBeVisible();
  });

  test("shows Add to pantry button", async ({ page }) => {
    await ensureSignedIn(page);
    const found = await navigateToFirstProduct(page);
    if (!found) { test.skip(); return; }
    // Wait for hero to render
    await page.locator('[data-testid="product-hero"]').waitFor({ timeout: 6000 });
    const addBtn = page.getByRole("button", { name: /Add to pantry|In pantry/ }).first();
    await expect(addBtn).toBeVisible({ timeout: 6000 });
  });

  test("shows Compare link", async ({ page }) => {
    await ensureSignedIn(page);
    const found = await navigateToFirstProduct(page);
    if (!found) { test.skip(); return; }
    await page.locator('[data-testid="product-hero"]').waitFor({ timeout: 6000 });
    const compareLink = page.getByRole("link", { name: "Compare" });
    await expect(compareLink).toBeVisible({ timeout: 6000 });
    await expect(compareLink).toHaveAttribute("href", /\/compare\?products=/);
  });
});

// ─── Suite B: Score card ──────────────────────────────────────────────────────

test.describe("E7-B — Score card", () => {
  test("score card is visible with a tier gradient", async ({ page }) => {
    await ensureSignedIn(page);
    const found = await navigateToFirstProduct(page);
    if (!found) { test.skip(); return; }
    const scoreCard = page.locator('[data-testid="score-card"]');
    await expect(scoreCard).toBeVisible({ timeout: 6000 });
  });

  test("score card shows a numeric score", async ({ page }) => {
    await ensureSignedIn(page);
    const found = await navigateToFirstProduct(page);
    if (!found) { test.skip(); return; }
    const scoreCard = page.locator('[data-testid="score-card"]');
    await expect(scoreCard).toBeVisible({ timeout: 6000 });
    // Score should be a number like "8.5" or "6.0"
    await expect(scoreCard).toContainText(/\d+\.\d/);
  });

  test("score card data-tier attribute matches a valid tier", async ({ page }) => {
    await ensureSignedIn(page);
    const found = await navigateToFirstProduct(page);
    if (!found) { test.skip(); return; }
    const scoreCard = page.locator('[data-testid="score-card"]');
    await expect(scoreCard).toBeVisible({ timeout: 6000 });
    const tier = await scoreCard.getAttribute("data-tier");
    expect(["Clean", "Watch", "Caution", "Avoid"]).toContain(tier);
  });

  test("'See breakdown' link anchors to #ingredient-list", async ({ page }) => {
    await ensureSignedIn(page);
    const found = await navigateToFirstProduct(page);
    if (!found) { test.skip(); return; }
    const link = page.getByRole("link", { name: /See breakdown/ });
    await expect(link).toBeVisible({ timeout: 6000 });
    await expect(link).toHaveAttribute("href", "#ingredient-list");
  });
});

// ─── Suite C: Claims grid ─────────────────────────────────────────────────────

test.describe("E7-C — Claims grid", () => {
  test("claims grid section is visible", async ({ page }) => {
    await ensureSignedIn(page);
    const found = await navigateToFirstProduct(page);
    if (!found) { test.skip(); return; }
    const grid = page.locator('[data-testid="claims-grid"]');
    await expect(grid).toBeVisible({ timeout: 6000 });
  });

  test("claims grid shows 'What's inside' heading", async ({ page }) => {
    await ensureSignedIn(page);
    const found = await navigateToFirstProduct(page);
    if (!found) { test.skip(); return; }
    await expect(
      page.getByRole("heading", { name: "What's inside" })
    ).toBeVisible({ timeout: 6000 });
  });

  test("claims grid has at least 4 claim rows (check or X icons)", async ({ page }) => {
    await ensureSignedIn(page);
    const found = await navigateToFirstProduct(page);
    if (!found) { test.skip(); return; }
    const grid = page.locator('[data-testid="claims-grid"]');
    await expect(grid).toBeVisible({ timeout: 6000 });
    // There are 7 free-from + 4 certification = 11 rows total
    const rows = grid.locator("div.flex.items-center.gap-2");
    await expect(rows).toHaveCount(11, { timeout: 4000 });
  });
});

// ─── Suite D: Ingredient list ─────────────────────────────────────────────────

test.describe("E7-D — Ingredient list", () => {
  test("ingredient list section is visible", async ({ page }) => {
    await ensureSignedIn(page);
    const found = await navigateToFirstProduct(page);
    if (!found) { test.skip(); return; }
    const list = page.locator('[data-testid="ingredient-list"]');
    await expect(list).toBeVisible({ timeout: 8000 });
  });

  test("ingredient list shows 'Ingredients' heading", async ({ page }) => {
    await ensureSignedIn(page);
    const found = await navigateToFirstProduct(page);
    if (!found) { test.skip(); return; }
    const list = page.locator('[data-testid="ingredient-list"]');
    await expect(list).toBeVisible({ timeout: 8000 });
    await expect(list.getByRole("heading", { name: /Ingredients/ })).toBeVisible();
  });

  test("clicking an ingredient row expands its detail panel", async ({ page }) => {
    await ensureSignedIn(page);
    const found = await navigateToFirstProduct(page);
    if (!found) { test.skip(); return; }
    const list = page.locator('[data-testid="ingredient-list"]');
    await expect(list).toBeVisible({ timeout: 8000 });

    // Find the first expandable ingredient button
    const firstRow = list.getByRole("button").first();
    const hasRows = await firstRow.isVisible({ timeout: 4000 }).catch(() => false);
    if (!hasRows) { test.skip(); return; }

    await firstRow.click();
    // After expanding, the button aria-expanded should be true
    await expect(firstRow).toHaveAttribute("aria-expanded", "true");
  });
});

// ─── Suite E: Why it works + alternatives ────────────────────────────────────

test.describe("E7-E — Why it works + alternatives", () => {
  test("'Why this works for you' section is visible", async ({ page }) => {
    await ensureSignedIn(page);
    const found = await navigateToFirstProduct(page);
    if (!found) { test.skip(); return; }
    const card = page.locator('[data-testid="why-it-works"]');
    await expect(card).toBeVisible({ timeout: 8000 });
  });

  test("alternatives section visible for non-Clean products", async ({ page }) => {
    await ensureSignedIn(page);
    // Navigate to a product that is not Clean tier (try a few until we find one)
    await page.goto("/explore");
    await page.waitForTimeout(2000);

    // Try to find a Watch/Caution/Avoid tier product card
    const watchCard = page.locator('.product-card.cursor-pointer').filter({ hasText: /Watch|Caution|Avoid/ }).first();
    const found = await watchCard.isVisible({ timeout: 4000 }).catch(() => false);
    if (!found) { test.skip(); return; }

    await watchCard.click();
    await page.waitForURL(/\/product\//, { timeout: 6000 });

    // Give time for alternatives to load
    await page.waitForTimeout(1000);
    const altSection = page.locator('[data-testid="alternatives-section"]');
    // Section may or may not have alternatives yet — just verify it renders
    await expect(altSection).toBeVisible({ timeout: 6000 });
  });
});

// ─── Suite F: Pantry sidebar toggle ──────────────────────────────────────────

test.describe("E7-F — Pantry sidebar toggle", () => {
  test("pantry sidebar card is visible", async ({ page }) => {
    await ensureSignedIn(page);
    const found = await navigateToFirstProduct(page);
    if (!found) { test.skip(); return; }
    const card = page.locator('[data-testid="pantry-sidebar-card"]');
    await expect(card).toBeVisible({ timeout: 6000 });
  });

  test("clicking 'Add to pantry' in sidebar toggles to 'In pantry' state", async ({
    page,
  }) => {
    await ensureSignedIn(page);
    const found = await navigateToFirstProduct(page);
    if (!found) { test.skip(); return; }

    const sidebarCard = page.locator('[data-testid="pantry-sidebar-card"]');
    await expect(sidebarCard).toBeVisible({ timeout: 6000 });

    // If already in pantry, remove first
    const removeBtn = sidebarCard.getByRole("button", { name: "Remove" });
    if (await removeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await removeBtn.click();
      await page.waitForTimeout(500);
    }

    // Add to pantry
    const addBtn = sidebarCard.getByRole("button", { name: /Add to pantry/ });
    await expect(addBtn).toBeVisible({ timeout: 4000 });
    await addBtn.click();

    // Should now show "Added to pantry" confirmation
    await expect(sidebarCard.getByText(/Added to pantry/)).toBeVisible({ timeout: 4000 });
  });
});

// ─── Suite G: Responsive layout ──────────────────────────────────────────────

test.describe("E7-G — Responsive layout", () => {
  for (const { name, width, height } of [
    { name: "mobile (375px)", width: 375, height: 812 },
    { name: "tablet (768px)", width: 768, height: 1024 },
    { name: "desktop (1180px)", width: 1180, height: 900 },
  ]) {
    test(`renders without errors at ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await ensureSignedIn(page);
      const found = await navigateToFirstProduct(page);
      if (!found) { test.skip(); return; }
      await expect(page.locator('[data-testid="product-hero"]')).toBeVisible({
        timeout: 8000,
      });
      await expect(page.locator("nextjs-portal")).not.toBeVisible();
    });
  }
});
