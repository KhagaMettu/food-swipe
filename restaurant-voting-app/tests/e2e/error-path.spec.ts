import { test, expect } from "@playwright/test";

/**
 * E2E Test: Error Path
 *
 * Validates error handling when things go wrong:
 * - Empty prompt shows validation error
 * - Long prompt shows validation error
 *
 * NOTE: Testing Places API errors requires mocking at the network level,
 * which is better suited for integration tests. These tests cover
 * client-side error handling.
 */
test.describe("Error Path", () => {
  test("empty prompt shows validation error", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /where should we eat/i })
    ).toBeVisible({ timeout: 10000 });

    // Submit without entering anything
    await page.getByRole("button", { name: /find restaurants/i }).click();

    // Should show validation error
    await expect(page.getByText(/prompt cannot be empty/i)).toBeVisible();
  });

  test("prompt exceeding 500 chars shows validation error", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /where should we eat/i })
    ).toBeVisible({ timeout: 10000 });

    // Enter a very long prompt
    const longPrompt = "a".repeat(501);
    await page.getByLabel(/dining preferences/i).fill(longPrompt);
    await page.getByRole("button", { name: /find restaurants/i }).click();

    // Should show validation error about character limit
    await expect(page.getByText(/500 characters/i)).toBeVisible();
  });

  test("character counter updates as user types", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /where should we eat/i })
    ).toBeVisible({ timeout: 10000 });

    await page.getByLabel(/dining preferences/i).fill("hello");

    // Counter should show 5/500
    await expect(page.getByText("5/500")).toBeVisible();
  });
});
