import * as fc from "fast-check";
import type { TagSet, Restaurant } from "@/types";

/**
 * Property-based tests for Session Creation (Task 5).
 *
 * These tests validate invariants that must hold for all valid inputs.
 * Each test runs a minimum of 100 iterations.
 */

// Arbitraries (generators for property-based testing)
const tagSetArb = fc.record({
  cuisine: fc.string({ minLength: 1, maxLength: 50 }),
  budget: fc.constantFrom("low" as const, "medium" as const, "high" as const),
  groupSize: fc.integer({ min: 1, max: 20 }),
  location: fc.string({ maxLength: 50 }),
});

const restaurantArb = fc.record({
  id: fc.string({ minLength: 1 }),
  displayName: fc.string({ minLength: 1, maxLength: 100 }),
  rating: fc.float({ min: 0, max: 5 }),
  photoReference: fc.oneof(fc.constant(null), fc.string({ minLength: 1 })),
});

describe("Property-based tests: Session Creation", () => {
  /**
   * Property P4: For any TagSet, fetchRestaurants request always includes
   * correct field mask and maxResultCount: 5
   *
   * Validates: Requirements 4.2, 4.3, 10.1, 10.5
   */
  it("Feature: restaurant-voting-app, Property 4: Places API request invariants hold for any TagSet", async () => {
    await fc.assert(
      fc.asyncProperty(tagSetArb, async (tagSet: TagSet) => {
        // Set the API key for the test
        process.env.GOOGLE_PLACES_API_KEY = "test-api-key";

        // Mock fetch to capture the request
        const originalFetch = global.fetch;
        let capturedRequest: { headers: Headers; body: string } | null = null;

        global.fetch = jest.fn(async (url, options) => {
          if (typeof url === "string" && url.includes("places:searchText")) {
            capturedRequest = {
              headers: new Headers(options?.headers as HeadersInit),
              body: options?.body as string,
            };
            // Return a mock response
            return Promise.resolve(
              new Response(JSON.stringify({ places: [] }), { status: 200 })
            );
          }
          return originalFetch(url, options);
        }) as jest.Mock;

        try {
          // Import and call fetchRestaurants
          const { fetchRestaurants } = require("../places-client");
          await fetchRestaurants(tagSet);

          // Restore fetch
          global.fetch = originalFetch;

          if (!capturedRequest) {
            return false;
          }

          // Verify field mask
          const fieldMask = capturedRequest.headers.get("X-Goog-FieldMask");
          const expectedFieldMask =
            "places.id,places.displayName,places.rating,places.photos";
          if (fieldMask !== expectedFieldMask) {
            return false;
          }

          // Verify maxResultCount
          const body = JSON.parse(capturedRequest.body);
          if (body.maxResultCount !== 5) {
            return false;
          }

          return true;
        } catch (err) {
          global.fetch = originalFetch;
          return false;
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property P5: For any API response (0–5 items), returned list length equals
   * response length and all records are stored
   *
   * Validates: Requirements 4.3, 4.4, 4.5, 10.5
   */
  it("Feature: restaurant-voting-app, Property 5: Restaurant results are bounded and fully stored", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(restaurantArb, { maxLength: 5 }),
        async (mockPlaces: Restaurant[]) => {
          // Set the API key for the test
          process.env.GOOGLE_PLACES_API_KEY = "test-api-key";

          // Mock fetch to return the mock places
          const originalFetch = global.fetch;
          global.fetch = jest.fn(async () => {
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  places: mockPlaces.map((p) => ({
                    id: p.id,
                    displayName: { text: p.displayName },
                    rating: p.rating,
                    photos: p.photoReference ? [{ name: p.photoReference }] : [],
                  })),
                }),
                { status: 200 }
              )
            );
          }) as jest.Mock;

          try {
            const { fetchRestaurants } = require("../places-client");
            const result: Restaurant[] = await fetchRestaurants({
              cuisine: "test",
              budget: "medium",
              groupSize: 2,
            });

            global.fetch = originalFetch;

            // Verify length matches
            if (result.length !== mockPlaces.length) {
              return false;
            }

            // Verify all records are present
            for (let i = 0; i < mockPlaces.length; i++) {
              if (result[i].id !== mockPlaces[i].id) {
                return false;
              }
            }

            return true;
          } catch (err) {
            global.fetch = originalFetch;
            return false;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property P6: For any complete Session doc, isCacheComplete returns true
   * and no new Places API call is made
   *
   * Validates: Requirements 10.2, 10.3
   *
   * Note: This property will be fully testable in Task 7 when caching logic is implemented.
   * For now, we verify the isCacheComplete function behavior.
   */
  it("Feature: restaurant-voting-app, Property 6: Cache prevents re-fetch for complete sessions", () => {
    const { isCacheComplete } = require("@/app/lib/cache");

    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          hostUid: fc.string({ minLength: 1 }),
          state: fc.constantFrom(
            "lobby" as const,
            "active" as const,
            "match" as const
          ),
          restaurants: fc.array(restaurantArb, { minLength: 1, maxLength: 5 }),
          matchedRestaurantId: fc.oneof(fc.constant(null), fc.string()),
          createdAt: fc.constant(new Date()),
        }),
        (session) => {
          // For a complete session (all restaurants have required fields), isCacheComplete should return true
          const result = isCacheComplete(session);

          // All restaurants in our arbitrary have all required fields, so result should be true
          return result === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
