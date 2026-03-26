import { test, expect, type Page } from "@playwright/test";

const TEST_EMAIL = "e2e@clarvn.test";
const TEST_PASSWORD = "E2eTestPass123!";

/**
 * Signs up or signs in the test user via /login (idempotent).
 * Grant/revoke tests require isAdmin: true set on this account via the
 * Convex dashboard.
 */
async function ensureSignedIn(page: Page) {
  await page.goto("/login");

  // Try sign-up (idempotent — falls back to sign-in if account already exists)
  await page.getByRole("button", { name: "Create Account" }).first().click();
  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create Account" }).last().click();

  const result = await Promise.race([
    page.waitForURL(/\/(app|onboarding)/, { timeout: 6000 }).then(() => "ok"),
    page.waitForSelector("text=Could not create account", { timeout: 6000 }).then(() => "exists"),
  ]).catch(() => "timeout");

  if (result !== "ok") {
    await page.getByRole("button", { name: "Sign In" }).first().click();
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).last().click();
    await page.waitForURL(/\/(app|onboarding)/, { timeout: 8000 });
  }
}

test.describe("Admin — user management page", () => {
  test("unauthenticated: /admin/users redirects to /admin/login", async ({ page }) => {
    await page.goto("/admin/users");
    await page.waitForURL("**/admin/login", { timeout: 8000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("admin nav includes Users link when signed in", async ({ page }) => {
    await ensureSignedIn(page);
    // Navigate to /admin/users which handles non-admin gracefully (no ConvexError overlay)
    await page.goto("/admin/users");
    // Wait for the admin layout nav to render
    await page.waitForSelector("text=Queue", { timeout: 8000 });
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible({ timeout: 8000 });
  });

  test("/admin/users shows auth-gated content: either the page or 'no admin access'", async ({
    page,
  }) => {
    await ensureSignedIn(page);
    await page.goto("/admin/users");

    // Either the full page renders (admin user) or the "no access" message (non-admin)
    await expect(
      page.getByText("User Management").or(page.getByText("You do not have admin access"))
    ).toBeVisible({ timeout: 8000 });
  });

  test("admin user sees User Management page on /admin/users", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/admin/users");
    // The test account (e2e@clarvn.test) has isAdmin: true set via Convex dashboard.
    await expect(page.getByText("User Management")).toBeVisible({ timeout: 10000 });
  });

  test("/admin/users search input is visible for admin users", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/admin/users");

    // Wait for auth-gated content to resolve
    await expect(
      page.getByText("User Management").or(page.getByText("You do not have admin access"))
    ).toBeVisible({ timeout: 10000 });

    const userManagementVisible = await page.getByText("User Management").isVisible();
    if (userManagementVisible) {
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.getByRole("button", { name: "Search" })).toBeVisible();
    } else {
      await expect(page.getByText("You do not have admin access")).toBeVisible();
    }
  });
});

test.describe("Admin — grant and revoke premium (requires isAdmin on test account)", () => {
  test("search by email returns a result row with status pill", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/admin/users");
    await expect(page.getByText("User Management")).toBeVisible({ timeout: 10000 });

    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.getByRole("button", { name: "Search" }).click();

    // Result card should appear with the user's email
    await expect(page.getByText(TEST_EMAIL).first()).toBeVisible({ timeout: 8000 });
    // Status pill span should be visible (exact match avoids matching prose text)
    const statusPill = page.getByText("Free", { exact: true })
      .or(page.getByText("Active", { exact: true }))
      .or(page.getByText("Complimentary", { exact: true }))
      .or(page.getByText("Trialing", { exact: true }))
      .or(page.getByText("Expired", { exact: true }));
    await expect(statusPill.first()).toBeVisible({ timeout: 5000 });
  });

  test("grant 30-day premium changes status pill to Complimentary", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/admin/users");
    await expect(page.getByText("User Management")).toBeVisible({ timeout: 10000 });

    // Search for the test user
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText(TEST_EMAIL).first()).toBeVisible({ timeout: 8000 });

    // Select 30 days and grant
    await page.selectOption("select", "30");
    await page.getByRole("button", { name: "Grant Premium" }).click();

    // Status pill should update to Complimentary
    await expect(page.getByText("Complimentary", { exact: true }).first()).toBeVisible({ timeout: 8000 });
  });

  test("revoke premium reverts status pill to Free", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/admin/users");
    await expect(page.getByText("User Management")).toBeVisible({ timeout: 10000 });

    // Search for the test user
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText(TEST_EMAIL).first()).toBeVisible({ timeout: 8000 });

    // Grant first if not already complimentary
    const isComplimentary = await page.getByText("Complimentary", { exact: true }).first().isVisible();
    if (!isComplimentary) {
      await page.selectOption("select", "30");
      await page.getByRole("button", { name: "Grant Premium" }).click();
      await expect(page.getByText("Complimentary", { exact: true }).first()).toBeVisible({ timeout: 8000 });
    }

    // Revoke
    await page.getByRole("button", { name: "Revoke" }).first().click();

    // Status pill should revert
    const revokedPill = page.getByText("Free", { exact: true }).or(page.getByText("Expired", { exact: true }));
    await expect(revokedPill.first()).toBeVisible({ timeout: 8000 });
  });
});
