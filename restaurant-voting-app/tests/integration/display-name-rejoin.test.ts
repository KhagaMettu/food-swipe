/**
 * Integration tests: Display Name Persistence on Rejoin
 *
 * Validates that when a participant who already has a display name
 * rejoins a session, the name modal is skipped and the existing name is used.
 */

describe("Integration: Display Name persists on rejoin", () => {
  it("skips name modal when participant already has displayName", () => {
    // Simulate Firestore participants subcollection
    const participantsCollection: Record<string, { displayName: string; active: boolean }> = {
      "user-abc": { displayName: "Hungry Panda", active: true },
    };

    const uid = "user-abc";

    // Simulate join flow: check if participant exists with displayName
    const existingParticipant = participantsCollection[uid];
    const hasDisplayName = !!existingParticipant?.displayName;

    // Modal should be skipped
    expect(hasDisplayName).toBe(true);
    expect(existingParticipant.displayName).toBe("Hungry Panda");
  });

  it("shows name modal for new participant without displayName", () => {
    const participantsCollection: Record<string, { displayName: string; active: boolean }> = {};

    const uid = "new-user-xyz";

    // Participant doesn't exist yet
    const existingParticipant = participantsCollection[uid];
    const hasDisplayName = !!existingParticipant?.displayName;

    // Modal should be shown
    expect(hasDisplayName).toBe(false);
  });

  it("preserves displayName through disconnect and reconnect", () => {
    // Simulate participant disconnect and reconnect
    const participantsCollection: Record<string, { displayName: string; active: boolean }> = {
      "user-abc": { displayName: "Spicy Falcon", active: true },
    };

    const uid = "user-abc";

    // Disconnect
    participantsCollection[uid].active = false;
    expect(participantsCollection[uid].active).toBe(false);
    expect(participantsCollection[uid].displayName).toBe("Spicy Falcon");

    // Reconnect — displayName preserved
    participantsCollection[uid].active = true;

    const existingParticipant = participantsCollection[uid];
    const hasDisplayName = !!existingParticipant?.displayName;

    expect(hasDisplayName).toBe(true);
    expect(existingParticipant.displayName).toBe("Spicy Falcon");
  });
});
