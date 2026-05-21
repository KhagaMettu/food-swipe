import { test, expect } from "@playwright/test";

/**
 * E2E Test: No-Match Path
 *
 * All participants swipe left on all cards → No Match screen appears.
 *
 * NOTE: Requires Firebase Emulator + Next.js dev server running.
 */
test.describe("No-Match Path", () => {
  test("swiping left on all cards shows No Match screen", async ({ page }) => {
    // Create a session
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /where should we eat/i })
    ).toBeVisible({ timeout: 10000 });

    await page.getByLabel(/dining preferences/i).fill("2 friends, Thai, Manchester");
    await page.getByRole("button", { name: /find restaurants/i }).click();

    await expect(page).toHaveURL(/\/session\//, { timeout: 30000 });

    // Wait for restaurants and start voting
    await expect(page.getByText(/restaurants ready/i)).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /start voting/i }).click();

    // Swipe left (reject) on all cards
    await expect(page.getByText(/remaining/i)).toBeVisible({ timeout: 10000 });

    // Click reject button for each card
    const totalCards = 5;
    for (let i = 0; i < totalCards; i++) {
      const rejectButton = page.getByLabel(/reject restaurant/i).first();
      if (await rejectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rejectButton.click();
        // Wait for animation/write to complete
        await page.waitForTimeout(500);
      }
    }

    // Should show No Match screen or Waiting screen (single player → no_match)
    await expect(
      page.getByText(/no match found|waiting for others/i)
    ).toBeVisible({ timeout: 10000 });
  });
});
