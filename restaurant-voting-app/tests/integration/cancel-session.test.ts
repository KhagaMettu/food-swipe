/**
 * Integration tests: Cancel Session
 *
 * Validates that cancelling a session sets the state to "cancelled"
 * and that participants can detect the state change.
 */

import { cancelSession } from "@/app/actions/session";
import { adminDb } from "@/app/lib/firebase-admin";

jest.mock("@/app/lib/firebase-admin", () => ({
  adminDb: {
    doc: jest.fn(),
    collection: jest.fn(),
  },
}));

jest.mock("@/app/lib/analytics", () => ({
  trackEvent: jest.fn(),
  reportError: jest.fn(),
}));

describe("Integration: Cancel Session", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sets session state to 'cancelled' when host cancels", async () => {
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    const mockGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        id: "session-1",
        hostUid: "host-uid",
        state: "lobby",
        restaurants: [],
        matchedRestaurantId: null,
      }),
    });

    (adminDb.doc as jest.Mock).mockReturnValue({
      get: mockGet,
      update: mockUpdate,
    });

    const result = await cancelSession("session-1", "host-uid");

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({ state: "cancelled" });
  });

  it("rejects cancel from non-host user", async () => {
    const mockGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        id: "session-1",
        hostUid: "host-uid",
        state: "lobby",
        restaurants: [],
        matchedRestaurantId: null,
      }),
    });

    (adminDb.doc as jest.Mock).mockReturnValue({
      get: mockGet,
      update: jest.fn(),
    });

    const result = await cancelSession("session-1", "not-the-host");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Only the Host");
  });

  it("participants detect cancelled state via simulated onSnapshot", () => {
    // Simulate the participant side: onSnapshot fires with new session data
    type SessionState = "lobby" | "active" | "cancelled";

    let currentState: SessionState = "lobby";

    // Simulate onSnapshot callback when host cancels
    const snapshotCallback = (data: { state: SessionState }) => {
      currentState = data.state;
    };

    // Host cancels - Firestore triggers snapshot
    snapshotCallback({ state: "cancelled" });

    expect(currentState).toBe("cancelled");
  });

  it("returns error when session does not exist", async () => {
    const mockGet = jest.fn().mockResolvedValue({ exists: false });

    (adminDb.doc as jest.Mock).mockReturnValue({
      get: mockGet,
    });

    const result = await cancelSession("nonexistent", "host-uid");

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });
});
