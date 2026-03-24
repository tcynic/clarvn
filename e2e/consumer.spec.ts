import { test, expect, type Page } from "@playwright/test";

// Sets a completed onboarding profile in localStorage before page load.
// Must be called before page.goto().
async function setProfile(
  page: Page,
  conditions: string[] = [],
  sensitivities: string[] = []
) {
  await page.addInitScript((profile) => {
    localStorage.setItem("cleanlist_profile", JSON.stringify(profile));
  }, { motivation: ["General curiosity"], conditions, sensitivities });
}

// Clears the profile so the onboarding redirect fires.
// Must be called before page.goto().
async function clearProfile(page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem("cleanlist_profile");
  });
}

test.describe("Onboarding", () => {
  test("redirects to /onboarding when no profile exists", async ({ page }) => {
    await clearProfile(page);
    await page.goto("/");
    await page.waitForURL("**/onboarding", { timeout: 8000 });
    await expect(
      page.getByText("What brings you to CleanList?")
    ).toBeVisible();
  });

  test("completes 3-step onboarding and lands on shopping list", async ({
    page,
  }) => {
    await clearProfile(page);
    await page.goto("/onboarding");

    // Step 1 — motivation (must pick at least one to enable Continue)
    await page.getByText("General curiosity").click();
    await page.getByRole("button", { name: "Continue →" }).click();

    // Step 2 — conditions
    await page.getByRole("button", { name: "None" }).click();
    await page.getByRole("button", { name: "Continue →" }).click();

    // Step 3 — sensitivities
    await page.getByRole("button", { name: "None" }).click();
    await page.getByRole("button", { name: "Start Scoring" }).click();

    await page.waitForURL("/", { timeout: 8000 });
    await expect(
      page.getByPlaceholder(/Search or add a product/)
    ).toBeVisible();
  });

  test("disclosure text is present on onboarding page", async ({ page }) => {
    await clearProfile(page);
    await page.goto("/onboarding");
    await expect(page.getByText(/Scores are AI-generated/)).toBeVisible();
  });
});

test.describe("Shopping list — miss state", () => {
  test.beforeEach(async ({ page }) => {
    await setProfile(page);
  });

  test("unscored product shows Not yet scored", async ({ page }) => {
    await page.goto("/");
    await page
      .getByPlaceholder(/Search or add a product/)
      .fill("ZzZzNonExistentProduct9999");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("Not yet scored")).toBeVisible();
  });

  test("Request button queues the product and shows Requested badge", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByPlaceholder(/Search or add a product/)
      .fill("ZzZzNonExistentProduct9999");
    await page.getByRole("button", { name: "Add" }).click();
    await page.getByRole("button", { name: "Request" }).click();
    await expect(page.getByText(/Requested/)).toBeVisible();
    // Request button should be gone
    await expect(
      page.getByRole("button", { name: "Request" })
    ).not.toBeVisible();
  });

  test("adding a duplicate product does not add a second row", async ({
    page,
  }) => {
    await page.goto("/");
    const input = page.getByPlaceholder(/Search or add a product/);
    await input.fill("ZzZzNonExistentProduct9999");
    await page.getByRole("button", { name: "Add" }).click();
    await input.fill("ZzZzNonExistentProduct9999");
    await page.getByRole("button", { name: "Add" }).click();
    // Only one "Not yet scored" row
    await expect(page.getByText("Not yet scored")).toHaveCount(1);
  });
});

test.describe("Profile editing", () => {
  test.beforeEach(async ({ page }) => {
    await setProfile(page);
  });

  test("profile pill opens panel with Your Profile heading", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Profile/ }).click();
    await expect(page.getByText("Your Profile")).toBeVisible();
  });

  test("toggling a condition updates the active count in the pill", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Profile/ }).click();
    // Toggle ADHD on
    await page.getByRole("button", { name: "ADHD" }).first().click();
    // Close panel
    await page.locator(".fixed button:has-text('×')").click();
    // Pill should now show "1 active"
    await expect(
      page.getByRole("button", { name: /1 active/ })
    ).toBeVisible();
  });

  test("toggling two conditions shows correct count", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Profile/ }).click();
    await page.getByRole("button", { name: "ADHD" }).first().click();
    await page.getByRole("button", { name: /IBS/ }).first().click();
    await page.locator(".fixed button:has-text('×')").click();
    await expect(
      page.getByRole("button", { name: /2 active/ })
    ).toBeVisible();
  });
});

test.describe("Shopping list — with ADHD profile", () => {
  test("profile pill shows condition count on page load when profile is set", async ({
    page,
  }) => {
    await setProfile(page, ["ADHD"], []);
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /1 active/ })
    ).toBeVisible();
  });
});
