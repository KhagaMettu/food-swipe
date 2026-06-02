import { test, expect } from "@playwright/test";

/**
 * E2E Test: Geolocation Flow
 *
 * Tests that the "Use my location" button works with mocked geolocation,
 * displays the location indicator, and the session is created with location context.
 *
 * NOTE: This test requires the Firebase Emulator and Next.js dev server running.
 */
test.describe("Geolocation Flow", () => {
  test("location indicator appears after granting geolocation permission", async ({
    page,
    context,
  }) => {
    // Mock geolocation permissions and coordinates
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 54.5973, longitude: -5.9301 });

    await page.goto("/");

    // Wait for auth to complete
    await expect(
      page.getByRole("heading", { name: /where should we eat/i })
    ).toBeVisible({ timeout: 10000 });

    // Click "Use my location" button
    await page.getByRole("button", { name: /use my location/i }).click();

    // Location indicator should appear with detected text
    await expect(page.getByText(/detected/i)).toBeVisible({ timeout: 10000 });
  });

  test("location can be cleared after detection", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 54.5973, longitude: -5.9301 });

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /where should we eat/i })
    ).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /use my location/i }).click();
    await expect(page.getByText(/detected/i)).toBeVisible({ timeout: 10000 });

    // Clear the location
    await page.getByRole("button", { name: /clear detected location/i }).click();

    // Location indicator should disappear, button should return
    await expect(page.getByRole("button", { name: /use my location/i })).toBeVisible();
    await expect(page.getByText(/detected/i)).not.toBeVisible();
  });

  test("session can be created with location context", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 54.5973, longitude: -5.9301 });

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /where should we eat/i })
    ).toBeVisible({ timeout: 10000 });

    // Use geolocation
    await page.getByRole("button", { name: /use my location/i }).click();
    await expect(page.getByText(/detected/i)).toBeVisible({ timeout: 10000 });

    // Fill prompt and submit
    await page.getByLabel(/dining preferences/i).fill("4 friends, pizza nearby");
    await page.getByRole("button", { name: /find restaurants/i }).click();

    // Should navigate to session page
    await expect(page).toHaveURL(/\/session\//, { timeout: 30000 });
    await expect(page.getByText(/waiting for everyone/i)).toBeVisible({ timeout: 10000 });
  });
});
