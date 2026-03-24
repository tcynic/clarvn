import { test, expect } from "@playwright/test";

test.describe("Admin — auth guard", () => {
  test("navigating to admin subdomain root redirects to /admin/login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("http://admin.localhost:3000/");
    await page.waitForURL("**/admin/login", { timeout: 8000 });
    await expect(page.getByText("Sign in to continue")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("/admin/login page renders the clarvn Admin heading", async ({
    page,
  }) => {
    await page.goto("http://admin.localhost:3000/login");
    await expect(page.getByText(/clarvn/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign In" })
    ).toBeVisible();
  });

  test("direct /admin access on main domain redirects to home", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000/admin");
    await page.waitForURL("http://localhost:3000/", { timeout: 8000 });
    await expect(page.getByText(/Know what/)).toBeVisible();
  });
});
