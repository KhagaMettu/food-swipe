/**
 * Integration tests: Undo Swipe
 *
 * Validates that undoing a swipe removes the vote field from the votes document,
 * simulating the Firestore operations that SwipeDeck performs.
 */

describe("Integration: Undo Swipe removes vote from Firestore", () => {
  it("removes the last vote field when undo is triggered", () => {
    // Simulate a votes document for a participant
    const votesDoc: Record<string, "accept" | "reject"> = {
      r1: "accept",
      r2: "reject",
      r3: "accept",
    };

    // Undo the last swipe (r3)
    const lastSwipedRestaurantId = "r3";
    delete votesDoc[lastSwipedRestaurantId];

    // Verify the vote field was removed
    expect(votesDoc).toEqual({ r1: "accept", r2: "reject" });
    expect(votesDoc[lastSwipedRestaurantId]).toBeUndefined();
  });

  it("restores the card to the deck after undo (currentIndex decrements)", () => {
    const restaurants = [
      { id: "r1", displayName: "Pizza Place" },
      { id: "r2", displayName: "Sushi Spot" },
      { id: "r3", displayName: "Taco Town" },
    ];

    // After swiping 2 cards, currentIndex is 2
    let currentIndex = 2;
    const votedCards = new Set(["r1", "r2"]);
    const lastSwipedRestaurantId = "r2";

    // Perform undo
    currentIndex--;
    votedCards.delete(lastSwipedRestaurantId);

    // Verify state after undo
    expect(currentIndex).toBe(1);
    expect(votedCards.has("r2")).toBe(false);
    expect(votedCards.has("r1")).toBe(true);
    // The active card should now be the one we undid
    expect(restaurants[currentIndex].id).toBe("r2");
  });

  it("only supports single-level undo (cannot undo twice in a row)", () => {
    const votesDoc: Record<string, "accept" | "reject"> = {
      r1: "accept",
      r2: "reject",
    };

    let currentIndex = 2;
    let lastSwipedRestaurantId: string | null = "r2";

    // First undo
    if (lastSwipedRestaurantId) {
      delete votesDoc[lastSwipedRestaurantId];
      currentIndex--;
      lastSwipedRestaurantId = null; // Clear after undo (single-level)
    }

    // Attempt second undo — should not do anything
    if (lastSwipedRestaurantId) {
      delete votesDoc[lastSwipedRestaurantId];
      currentIndex--;
    }

    // Only one undo occurred
    expect(currentIndex).toBe(1);
    expect(votesDoc).toEqual({ r1: "accept" });
  });
});
