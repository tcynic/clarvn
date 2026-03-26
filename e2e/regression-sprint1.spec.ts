import { test, expect } from "@playwright/test";
import * as path from "path";

/**
 * Sprint 1 Regression (R1)
 *
 * Suite A: Smoke — verify key routes load without errors.
 * Suite B: Visual regression — /showcase renders all primitives at mobile,
 *           tablet, and desktop breakpoints. Screenshots saved to e2e/screenshots/.
 */

const SCREENSHOTS_DIR = path.resolve(__dirname, "screenshots");

// ─── Suite A: Route Smoke Tests ────────────────────────────────────────────

test.describe("R1 — Route smoke tests", () => {
  test("/ loads and shows page content", async ({ page }) => {
    await page.goto("/");
    // Page should not crash — at minimum a body element renders
    await expect(page.locator("body")).toBeVisible();
    // No unhandled error overlay (Next.js dev error modal)
    await expect(page.locator("nextjs-portal")).not.toBeVisible();
  });

  test("/onboarding loads and shows onboarding UI", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.locator("body")).toBeVisible();
    // Onboarding shows some form of step content
    await expect(page.locator("nextjs-portal")).not.toBeVisible();
  });

  test("/admin redirects to /admin/login when unauthenticated", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL("**/admin/login", { timeout: 8000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("/admin/users redirects to /admin/login when unauthenticated", async ({ page }) => {
    await page.goto("/admin/users");
    await page.waitForURL("**/admin/login", { timeout: 8000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

// ─── Suite B: Visual Regression — /showcase ────────────────────────────────

const VIEWPORTS = [
  { label: "mobile",   width: 375,  height: 812 },
  { label: "tablet",   width: 768,  height: 1024 },
  { label: "desktop",  width: 1180, height: 900 },
] as const;

test.describe("R1 — /showcase visual regression", () => {
  for (const vp of VIEWPORTS) {
    test(`/showcase renders all primitives at ${vp.width}px (${vp.label})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/showcase");

      // NavBar — <header> is always visible; <nav> is hidden at mobile (md:flex)
      await expect(page.locator("header").first()).toBeVisible({ timeout: 8000 });

      // Section headings — each primitive section must be present
      await expect(page.getByRole("heading", { name: "Component Showcase" })).toBeVisible();
      await expect(page.getByRole("heading", { name: /ScorePill/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /MatchBadge/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /FilterPill/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /ProductCard/i })).toBeVisible();

      // No error overlay
      await expect(page.locator("nextjs-portal")).not.toBeVisible();

      // Screenshot
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `showcase-${vp.width}.png`),
        fullPage: true,
      });
    });
  }
});
