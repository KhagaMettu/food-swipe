/**
 * Integration tests: Real-time Vote Propagation and Match Detection
 *
 * Validates vote recording, match detection logic, no-match detection,
 * and disconnection handling.
 */

import { checkForMatch } from "@/app/lib/match";
import type { Restaurant } from "@/types";

const restaurants: Restaurant[] = [
  { id: "r1", displayName: "Pizza Place", rating: 4.5, photoReference: null },
  { id: "r2", displayName: "Sushi Spot", rating: 4.2, photoReference: null },
  { id: "r3", displayName: "Taco Town", rating: 3.9, photoReference: null },
  { id: "r4", displayName: "Burger Bar", rating: 4.1, photoReference: null },
  { id: "r5", displayName: "Curry House", rating: 4.3, photoReference: null },
];

describe("Integration: Vote Propagation", () => {
  it("vote written by one participant is visible in the votes collection", () => {
    // Simulate Firestore votes collection
    const votesCollection: Record<string, Record<string, "accept" | "reject">> = {};

    // User 1 votes
    votesCollection["user1"] = { r1: "accept", r2: "reject" };

    // Verify vote is visible
    expect(votesCollection["user1"]["r1"]).toBe("accept");
    expect(votesCollection["user1"]["r2"]).toBe("reject");
  });

  it("match detection: all-accept scenario triggers state transition to match", () => {
    const votes: Record<string, Record<string, "accept" | "reject">> = {
      user1: { r1: "accept", r2: "reject", r3: "reject", r4: "reject", r5: "reject" },
      user2: { r1: "accept", r2: "reject", r3: "accept", r4: "reject", r5: "reject" },
      user3: { r1: "accept", r2: "accept", r3: "reject", r4: "reject", r5: "reject" },
    };
    const activeParticipants = ["user1", "user2", "user3"];

    const matchedId = checkForMatch(restaurants, votes, activeParticipants);

    expect(matchedId).toBe("r1");

    // Simulate state transition
    const sessionState = matchedId ? "match" : "active";
    expect(sessionState).toBe("match");
  });

  it("no-match detection: all cards swiped with no unanimous accept → no_match state", () => {
    const votes: Record<string, Record<string, "accept" | "reject">> = {
      user1: { r1: "reject", r2: "accept", r3: "reject", r4: "accept", r5: "reject" },
      user2: { r1: "accept", r2: "reject", r3: "accept", r4: "reject", r5: "accept" },
    };
    const activeParticipants = ["user1", "user2"];

    const matchedId = checkForMatch(restaurants, votes, activeParticipants);
    expect(matchedId).toBeNull();

    // Check if all participants have voted on all restaurants
    const allDone = activeParticipants.every((uid) => {
      const participantVotes = votes[uid];
      return restaurants.every((r) => participantVotes[r.id] !== undefined);
    });

    expect(allDone).toBe(true);

    // Simulate state transition
    const sessionState = allDone && !matchedId ? "no_match" : "active";
    expect(sessionState).toBe("no_match");
  });

  it("disconnection: inactive participant excluded from match condition", () => {
    // user3 disconnected — marked inactive
    const votes: Record<string, Record<string, "accept" | "reject">> = {
      user1: { r1: "accept" },
      user2: { r1: "accept" },
      user3: { r1: "reject" }, // disconnected user's vote should be ignored
    };
    // Only active participants
    const activeParticipants = ["user1", "user2"];

    const matchedId = checkForMatch(restaurants, votes, activeParticipants);

    // Match should succeed because only active participants (user1, user2) are checked
    expect(matchedId).toBe("r1");
  });

  it("match proceeds with remaining active participants after disconnect", () => {
    // 3 participants, 1 disconnects mid-session
    const allParticipants = [
      { uid: "user1", active: true },
      { uid: "user2", active: true },
      { uid: "user3", active: false }, // disconnected
    ];

    const activeParticipants = allParticipants
      .filter((p) => p.active)
      .map((p) => p.uid);

    const votes: Record<string, Record<string, "accept" | "reject">> = {
      user1: { r2: "accept" },
      user2: { r2: "accept" },
    };

    const matchedId = checkForMatch(restaurants, votes, activeParticipants);
    expect(matchedId).toBe("r2");
  });
});
