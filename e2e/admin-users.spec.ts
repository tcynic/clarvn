import { test, expect } from "@playwright/test";

test.describe("Admin — user management", () => {
  test("navigating to /admin/users redirects to /admin/login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/admin/users");
    await page.waitForURL("**/admin/login", { timeout: 8000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("/admin/users page renders correctly when authenticated as admin", async ({
    page,
  }) => {
    // Sign in as admin
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', "e2e@clarvn.test");
    await page.fill('input[type="password"]', "E2eTestPass123!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("**/admin**", { timeout: 10000 });

    await page.goto("/admin/users");
    await expect(page.getByText("User Management")).toBeVisible({ timeout: 8000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByText("Search by Email")).toBeVisible();
    await expect(page.getByText("Complimentary Accounts")).toBeVisible();
  });

  test("/admin/users search for unknown email shows 'No user found'", async ({
    page,
  }) => {
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', "e2e@clarvn.test");
    await page.fill('input[type="password"]', "E2eTestPass123!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("**/admin**", { timeout: 10000 });

    await page.goto("/admin/users");
    await page.waitForSelector('input[type="email"]', { timeout: 8000 });

    await page.fill('input[type="email"]', "nobody@doesnotexist.test");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page.getByText("No user found with that email")).toBeVisible({
      timeout: 8000,
    });
  });

  test("admin nav includes Users link", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', "e2e@clarvn.test");
    await page.fill('input[type="password"]', "E2eTestPass123!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("**/admin**", { timeout: 10000 });

    await expect(page.getByRole("link", { name: "Users" })).toBeVisible({
      timeout: 8000,
    });
  });
});
