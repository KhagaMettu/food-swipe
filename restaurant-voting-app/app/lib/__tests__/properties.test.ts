/**
 * Property-based tests using fast-check.
 * Each property runs a minimum of 100 iterations.
 * Tag format: Feature: restaurant-voting-app, Property {N}: {property_text}
 */

import * as fc from "fast-check";
import { validatePrompt } from "../validation";
import { buildShareUrl, extractSessionId } from "../urls";
import { computeSwipeDirection } from "../swipe";
import { checkForMatch } from "../match";
import { buildGoogleMapsDeepLink, buildUberEatsDeepLink } from "../deep-links";
import type { Restaurant } from "@/types";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const restaurantArb = fc.record<Restaurant>({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  displayName: fc.string({ minLength: 1, maxLength: 100 }),
  rating: fc.float({ min: 0, max: 5, noNaN: true }),
  photoReference: fc.option(fc.string({ minLength: 1 }), { nil: null }),
});

const restaurantWithIdArb = restaurantArb.filter((r) => r.id.length > 0);

// ---------------------------------------------------------------------------
// P1 – validatePrompt accepts iff non-empty trimmed AND length ≤ 500
// Validates: Requirements 1.6
// ---------------------------------------------------------------------------
describe(
  "Feature: restaurant-voting-app, Property 1: validatePrompt accepts iff non-empty trimmed AND length ≤ 500",
  () => {
    it("holds for any string", () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const trimmed = input.trim();
          const result = validatePrompt(input);
          const shouldBeValid = trimmed.length > 0 && trimmed.length <= 500;
          expect(result.valid).toBe(shouldBeValid);
        }),
        { numRuns: 100 }
      );
    });
  }
);

// ---------------------------------------------------------------------------
// P3 – buildShareUrl round-trip recovers original sessionId
// Validates: Requirements 1.4
// ---------------------------------------------------------------------------
describe(
  "Feature: restaurant-voting-app, Property 3: buildShareUrl round-trip recovers original sessionId",
  () => {
    it("holds for any non-empty sessionId", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (sessionId) => {
          const url = buildShareUrl(sessionId);
          const recovered = extractSessionId(url);
          expect(recovered).toBe(sessionId);
        }),
        { numRuns: 100 }
      );
    });
  }
);

// ---------------------------------------------------------------------------
// P7 – computeSwipeDirection matches ±33% rule for any (offsetX, cardWidth) pair
// Validates: Requirements 6.1, 6.2
// ---------------------------------------------------------------------------
describe(
  "Feature: restaurant-voting-app, Property 7: computeSwipeDirection matches ±33% rule for any (offsetX, cardWidth) pair",
  () => {
    it("holds for any finite float pair with positive cardWidth", () => {
      fc.assert(
        fc.property(
          fc.float({ noNaN: true, noDefaultInfinity: true }),
          fc.float({ min: 1, max: 10000, noNaN: true, noDefaultInfinity: true }),
          (offsetX, cardWidth) => {
            const threshold = 0.33 * cardWidth;
            const direction = computeSwipeDirection(offsetX, cardWidth);

            if (offsetX > threshold) {
              expect(direction).toBe("accept");
            } else if (offsetX < -threshold) {
              expect(direction).toBe("reject");
            } else {
              expect(direction).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  }
);

// ---------------------------------------------------------------------------
// P9 – checkForMatch returns match iff all active participants accepted;
//       inactive participants are excluded
// Validates: Requirements 7.3, 7.4
// ---------------------------------------------------------------------------
describe(
  "Feature: restaurant-voting-app, Property 9: checkForMatch returns match iff all active participants accepted; inactive participants are excluded",
  () => {
    it("holds for any combination of restaurants, votes, and active flags", () => {
      // Arbitraries for this property
      const restaurantIdArb = fc.string({ minLength: 1, maxLength: 10 });
      const uidArb = fc.string({ minLength: 1, maxLength: 10 });
      const decisionArb = fc.constantFrom("accept" as const, "reject" as const);

      fc.assert(
        fc.property(
          // 1–5 unique restaurant IDs
          fc.uniqueArray(restaurantIdArb, { minLength: 1, maxLength: 5 }),
          // 1–5 unique participant UIDs
          fc.uniqueArray(uidArb, { minLength: 1, maxLength: 5 }),
          // For each participant, a random subset is "active"
          fc.float({ min: 0, max: 1, noNaN: true }),
          (restaurantIds, uids, activeFraction) => {
            const restaurants: Restaurant[] = restaurantIds.map((id) => ({
              id,
              displayName: `Restaurant ${id}`,
              rating: 4.0,
              photoReference: null,
            }));

            // Deterministically split uids into active/inactive
            const activeParticipants = uids.filter(
              (_, i) => i / uids.length < activeFraction
            );

            // Build a vote map: every participant accepts every restaurant
            // (this is the "all accept" scenario — should always match first restaurant)
            const allAcceptVotes: Record<string, Record<string, "accept" | "reject">> =
              {};
            for (const uid of uids) {
              allAcceptVotes[uid] = {};
              for (const id of restaurantIds) {
                allAcceptVotes[uid][id] = "accept";
              }
            }

            const result = checkForMatch(restaurants, allAcceptVotes, activeParticipants);

            if (activeParticipants.length === 0) {
              // No active participants → no match
              expect(result).toBeNull();
            } else {
              // All active participants accepted all restaurants → first restaurant matches
              expect(result).toBe(restaurantIds[0]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("never returns a match when at least one active participant rejected", () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.string({ minLength: 1, maxLength: 8 }), {
            minLength: 1,
            maxLength: 5,
          }),
          fc.uniqueArray(fc.string({ minLength: 1, maxLength: 8 }), {
            minLength: 2, // need at least 2 participants
            maxLength: 5,
          }),
          (restaurantIds, uids) => {
            const restaurants: Restaurant[] = restaurantIds.map((id) => ({
              id,
              displayName: `R-${id}`,
              rating: 4.0,
              photoReference: null,
            }));

            // uid[0] rejects everything, uid[1..] accepts everything
            const votes: Record<string, Record<string, "accept" | "reject">> = {};
            for (const uid of uids) {
              votes[uid] = {};
              for (const id of restaurantIds) {
                votes[uid][id] = uid === uids[0] ? "reject" : "accept";
              }
            }

            const result = checkForMatch(restaurants, votes, uids);
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  }
);

// ---------------------------------------------------------------------------
// P10 – Deep links are non-null and correctly formed for any restaurant
// Validates: Requirements 8.2, 8.3
// ---------------------------------------------------------------------------
describe(
  "Feature: restaurant-voting-app, Property 10: deep links are non-null and correctly formed for any restaurant with id/displayName",
  () => {
    it("buildGoogleMapsDeepLink returns non-null for any restaurant with a non-empty id", () => {
      fc.assert(
        fc.property(restaurantWithIdArb, (restaurant) => {
          const url = buildGoogleMapsDeepLink(restaurant);
          expect(url).not.toBeNull();
          expect(typeof url).toBe("string");
          expect((url as string).length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it("buildGoogleMapsDeepLink returns null for any restaurant with an empty id", () => {
      fc.assert(
        fc.property(restaurantArb, (restaurant) => {
          const withEmptyId = { ...restaurant, id: "" };
          expect(buildGoogleMapsDeepLink(withEmptyId)).toBeNull();
        }),
        { numRuns: 100 }
      );
    });

    it("buildUberEatsDeepLink contains URL-encoded displayName for any restaurant", () => {
      fc.assert(
        fc.property(restaurantArb, (restaurant) => {
          const url = buildUberEatsDeepLink(restaurant);
          expect(typeof url).toBe("string");
          expect(url.length).toBeGreaterThan(0);
          expect(url).toContain(encodeURIComponent(restaurant.displayName));
        }),
        { numRuns: 100 }
      );
    });
  }
);
