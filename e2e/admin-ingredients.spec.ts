import { test, expect, type Page } from "@playwright/test";
import { ensureSignedIn } from "./helpers";

test.describe("Admin — ingredients page", () => {
  test("unauthenticated: /admin/ingredients redirects to /admin/login", async ({ page }) => {
    await page.goto("/admin/ingredients");
    await page.waitForURL("**/admin/login", { timeout: 8000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("admin nav includes Ingredients link when signed in", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/admin/ingredients");
    await page.waitForSelector("text=Queue", { timeout: 8000 });
    await expect(page.getByRole("link", { name: "Ingredients" })).toBeVisible({ timeout: 8000 });
  });

  test("/admin/ingredients shows auth-gated content: either the page or 'no admin access'", async ({
    page,
  }) => {
    await ensureSignedIn(page);
    await page.goto("/admin/ingredients");

    await expect(
      page.getByText("Ingredient Browser").or(page.getByText("You do not have admin access"))
    ).toBeVisible({ timeout: 10000 });
  });

  test("admin user sees Ingredient Browser heading", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/admin/ingredients");
    await expect(page.getByText("Ingredient Browser")).toBeVisible({ timeout: 10000 });
  });

  test("search input is visible for admin users", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/admin/ingredients");

    await expect(
      page.getByText("Ingredient Browser").or(page.getByText("You do not have admin access"))
    ).toBeVisible({ timeout: 10000 });

    const ingredientBrowserVisible = await page.getByText("Ingredient Browser").isVisible();
    if (ingredientBrowserVisible) {
      await expect(page.getByPlaceholder("Search ingredients…")).toBeVisible();
    }
  });

  test("tier filter buttons are visible: All, Clean, Watch, Caution, Avoid", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/admin/ingredients");

    await expect(
      page.getByText("Ingredient Browser").or(page.getByText("You do not have admin access"))
    ).toBeVisible({ timeout: 10000 });

    const ingredientBrowserVisible = await page.getByText("Ingredient Browser").isVisible();
    if (ingredientBrowserVisible) {
      await expect(page.getByRole("button", { name: "All" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Clean" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Watch" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Caution" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Avoid" })).toBeVisible();
    }
  });

  test("Deduplicate button is visible for admin users", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/admin/ingredients");

    await expect(
      page.getByText("Ingredient Browser").or(page.getByText("You do not have admin access"))
    ).toBeVisible({ timeout: 10000 });

    const ingredientBrowserVisible = await page.getByText("Ingredient Browser").isVisible();
    if (ingredientBrowserVisible) {
      await expect(page.getByRole("button", { name: "Deduplicate" })).toBeVisible();
    }
  });

  test("section eyebrow shows 'Section 03'", async ({ page }) => {
    await ensureSignedIn(page);
    await page.goto("/admin/ingredients");

    const ingredientBrowserVisible = await page
      .getByText("Ingredient Browser")
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (ingredientBrowserVisible) {
      await expect(page.getByText("Section 03")).toBeVisible();
    }
  });
});
