import { checkForMatch } from "../match";
import type { Restaurant } from "@/types";

const restaurants: Restaurant[] = [
  { id: "r1", displayName: "Pizza Place", rating: 4.2, photoReference: null },
  { id: "r2", displayName: "Burger Bar", rating: 4.5, photoReference: null },
  { id: "r3", displayName: "Sushi Spot", rating: 4.8, photoReference: null },
];

describe("checkForMatch", () => {
  it("returns the matched restaurant ID when all active participants accepted the same restaurant", () => {
    const votes = {
      uid1: { r1: "accept" as const, r2: "reject" as const },
      uid2: { r1: "accept" as const, r2: "reject" as const },
    };
    expect(checkForMatch(restaurants, votes, ["uid1", "uid2"])).toBe("r1");
  });

  it("returns null when only some participants accepted a restaurant", () => {
    const votes = {
      uid1: { r1: "accept" as const },
      uid2: { r1: "reject" as const },
    };
    expect(checkForMatch(restaurants, votes, ["uid1", "uid2"])).toBeNull();
  });

  it("returns null when active participants list is empty", () => {
    const votes = {
      uid1: { r1: "accept" as const },
    };
    expect(checkForMatch(restaurants, votes, [])).toBeNull();
  });

  it("excludes inactive participants from the match condition", () => {
    // uid2 is inactive — only uid1 needs to accept
    const votes = {
      uid1: { r2: "accept" as const },
      uid2: { r2: "reject" as const }, // inactive, should be ignored
    };
    expect(checkForMatch(restaurants, votes, ["uid1"])).toBe("r2");
  });

  it("returns null when no restaurant has unanimous acceptance", () => {
    const votes = {
      uid1: { r1: "accept" as const, r2: "reject" as const, r3: "reject" as const },
      uid2: { r1: "reject" as const, r2: "accept" as const, r3: "reject" as const },
      uid3: { r1: "reject" as const, r2: "reject" as const, r3: "accept" as const },
    };
    expect(checkForMatch(restaurants, votes, ["uid1", "uid2", "uid3"])).toBeNull();
  });

  it("returns null when a participant has not yet voted on a restaurant", () => {
    // uid2 hasn't voted on r1 yet
    const votes = {
      uid1: { r1: "accept" as const },
      uid2: {}, // no votes yet
    };
    expect(checkForMatch(restaurants, votes, ["uid1", "uid2"])).toBeNull();
  });

  it("returns the first matching restaurant in order when multiple could match", () => {
    // Both r1 and r2 are accepted by all — should return r1 (first in list)
    const votes = {
      uid1: { r1: "accept" as const, r2: "accept" as const },
      uid2: { r1: "accept" as const, r2: "accept" as const },
    };
    expect(checkForMatch(restaurants, votes, ["uid1", "uid2"])).toBe("r1");
  });

  it("handles a single active participant correctly", () => {
    const votes = {
      uid1: { r3: "accept" as const },
    };
    expect(checkForMatch(restaurants, votes, ["uid1"])).toBe("r3");
  });
});
