import { checkForMatch } from "@/app/lib/match";
import type { Restaurant } from "@/types";

/**
 * Unit tests for match detection logic (Task 9.5).
 */

const restaurants: Restaurant[] = [
  { id: "r1", displayName: "Pizza Place", rating: 4.5, photoReference: null },
  { id: "r2", displayName: "Sushi Spot", rating: 4.2, photoReference: null },
  { id: "r3", displayName: "Taco Town", rating: 3.9, photoReference: null },
];

describe("Match Detection Logic", () => {
  it("all-accept triggers match — returns matched restaurant ID", () => {
    const votes = {
      user1: { r1: "accept" as const, r2: "reject" as const, r3: "reject" as const },
      user2: { r1: "accept" as const, r2: "accept" as const, r3: "reject" as const },
      user3: { r1: "accept" as const, r2: "reject" as const, r3: "accept" as const },
    };
    const activeParticipants = ["user1", "user2", "user3"];

    const result = checkForMatch(restaurants, votes, activeParticipants);
    expect(result).toBe("r1");
  });

  it("partial-accept does not trigger match", () => {
    const votes = {
      user1: { r1: "accept" as const, r2: "reject" as const },
      user2: { r1: "reject" as const, r2: "accept" as const },
    };
    const activeParticipants = ["user1", "user2"];

    const result = checkForMatch(restaurants, votes, activeParticipants);
    expect(result).toBeNull();
  });

  it("inactive participants are excluded from match condition", () => {
    const votes = {
      user1: { r1: "accept" as const },
      user2: { r1: "accept" as const },
      user3: { r1: "reject" as const }, // inactive — should be excluded
    };
    // Only user1 and user2 are active
    const activeParticipants = ["user1", "user2"];

    const result = checkForMatch(restaurants, votes, activeParticipants);
    expect(result).toBe("r1");
  });

  it("no-match when no restaurant has unanimous accept", () => {
    const votes = {
      user1: { r1: "reject" as const, r2: "accept" as const, r3: "reject" as const },
      user2: { r1: "accept" as const, r2: "reject" as const, r3: "reject" as const },
    };
    const activeParticipants = ["user1", "user2"];

    const result = checkForMatch(restaurants, votes, activeParticipants);
    expect(result).toBeNull();
  });

  it("returns first matched restaurant when multiple could match", () => {
    const votes = {
      user1: { r1: "accept" as const, r2: "accept" as const },
      user2: { r1: "accept" as const, r2: "accept" as const },
    };
    const activeParticipants = ["user1", "user2"];

    const result = checkForMatch(restaurants, votes, activeParticipants);
    // Should return the first one found (r1)
    expect(result).toBe("r1");
  });
});
