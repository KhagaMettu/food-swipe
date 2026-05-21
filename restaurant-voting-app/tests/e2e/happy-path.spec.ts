import { test, expect } from "@playwright/test";

/**
 * E2E Test: Happy Path
 *
 * Host creates session → participants join → all swipe right on same restaurant
 * → Match screen appears with correct deep links.
 *
 * NOTE: This test requires the Firebase Emulator to be running and the
 * Next.js dev server to be started. In CI, use the webServer config in
 * playwright.config.ts.
 */
test.describe("Happy Path", () => {
  test("Host can create a session and see the lobby", async ({ page }) => {
    // Navigate to home page
    await page.goto("/");

    // Wait for auth to complete (AuthGate)
    await expect(
      page.getByRole("heading", { name: /where should we eat/i })
    ).toBeVisible({ timeout: 10000 });

    // Fill in the prompt
    await page.getByLabel(/dining preferences/i).fill("4 friends, Italian, Belfast");

    // Submit the form
    await page.getByRole("button", { name: /find restaurants/i }).click();

    // Should navigate to session page and show lobby
    await expect(page).toHaveURL(/\/session\//, { timeout: 30000 });
    await expect(
      page.getByText(/waiting for everyone/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("Lobby shows participant count and share link", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /where should we eat/i })
    ).toBeVisible({ timeout: 10000 });

    await page.getByLabel(/dining preferences/i).fill("2 people, sushi, London");
    await page.getByRole("button", { name: /find restaurants/i }).click();

    await expect(page).toHaveURL(/\/session\//, { timeout: 30000 });

    // Should show participant count
    await expect(page.getByText(/participant/i)).toBeVisible({ timeout: 10000 });

    // Should show share link
    await expect(page.getByText(/share this link/i)).toBeVisible();
  });

  test("Host can start voting when restaurants are ready", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /where should we eat/i })
    ).toBeVisible({ timeout: 10000 });

    await page.getByLabel(/dining preferences/i).fill("3 friends, Mexican, Dublin");
    await page.getByRole("button", { name: /find restaurants/i }).click();

    await expect(page).toHaveURL(/\/session\//, { timeout: 30000 });

    // Wait for restaurants to load
    await expect(page.getByText(/restaurants ready/i)).toBeVisible({ timeout: 15000 });

    // Click Start Voting
    await page.getByRole("button", { name: /start voting/i }).click();

    // Should show the swipe deck with remaining counter
    await expect(page.getByText(/remaining/i)).toBeVisible({ timeout: 10000 });
  });
});
