import { test, expect } from "@playwright/test";

test.describe("Admin — auth guard", () => {
  test("navigating to /admin redirects to /admin/login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForURL("**/admin/login", { timeout: 8000 });
    await expect(page.getByText("Sign in to continue")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("/admin/login page renders the clarvn Admin heading", async ({
    page,
  }) => {
    await page.goto("/admin/login");
    await expect(page.getByText(/clarvn/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign In" })
    ).toBeVisible();
  });
});
