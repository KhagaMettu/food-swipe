import { retryFetchRestaurants } from "../session";
import { fetchRestaurants } from "../places-client";
import { isCacheComplete } from "@/app/lib/cache";
import { adminDb } from "@/app/lib/firebase-admin";

// Mock dependencies
jest.mock("../places-client");
jest.mock("@/app/lib/cache");
jest.mock("@/app/lib/firebase-admin", () => ({
  adminDb: {
    doc: jest.fn(),
    collection: jest.fn(),
  },
}));

const mockFetchRestaurants = fetchRestaurants as jest.MockedFunction<
  typeof fetchRestaurants
>;
const mockIsCacheComplete = isCacheComplete as jest.MockedFunction<
  typeof isCacheComplete
>;

describe("Restaurant Data Caching (Task 7)", () => {
  const mockSessionId = "session-cache-test";
  const mockHostUid = "host-uid-123";
  const mockTagSet = { cuisine: "Italian", budget: "medium" as const, groupSize: 4, location: "Belfast" };

  const completeSession = {
    id: mockSessionId,
    hostUid: mockHostUid,
    state: "error",
    restaurants: [
      { id: "r1", displayName: "Pizza Place", rating: 4.5, photoReference: "photo1" },
      { id: "r2", displayName: "Pasta House", rating: 4.2, photoReference: null },
    ],
    matchedRestaurantId: null,
    createdAt: new Date(),
  };

  const incompleteSession = {
    id: mockSessionId,
    hostUid: mockHostUid,
    state: "error",
    restaurants: [],
    matchedRestaurantId: null,
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("session with complete restaurant data does NOT trigger a new Places API call", async () => {
    // Mock Firestore read
    const mockGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => completeSession,
    });
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    (adminDb.doc as jest.Mock).mockReturnValue({
      get: mockGet,
      update: mockUpdate,
    });

    // isCacheComplete returns true
    mockIsCacheComplete.mockReturnValue(true);

    const result = await retryFetchRestaurants(
      mockSessionId,
      mockHostUid,
      mockTagSet
    );

    expect(result.success).toBe(true);
    // fetchRestaurants should NOT have been called
    expect(mockFetchRestaurants).not.toHaveBeenCalled();
    // Session should be transitioned back to lobby
    expect(mockUpdate).toHaveBeenCalledWith({ state: "lobby" });
  });

  it("session with missing restaurant data DOES trigger a Places API call", async () => {
    // Mock Firestore read
    const mockGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => incompleteSession,
    });
    const mockSet = jest.fn().mockResolvedValue(undefined);
    (adminDb.doc as jest.Mock).mockReturnValue({
      get: mockGet,
      set: mockSet,
      update: jest.fn(),
    });

    // isCacheComplete returns false
    mockIsCacheComplete.mockReturnValue(false);

    // Mock fetchRestaurants success
    mockFetchRestaurants.mockResolvedValue([
      { id: "r1", displayName: "New Place", rating: 4.0, photoReference: null },
    ]);

    const result = await retryFetchRestaurants(
      mockSessionId,
      mockHostUid,
      mockTagSet
    );

    expect(result.success).toBe(true);
    // fetchRestaurants SHOULD have been called
    expect(mockFetchRestaurants).toHaveBeenCalledWith(mockTagSet);
  });

  it("Firestore write failure after successful Places API call retries the write before re-fetching", async () => {
    // Mock Firestore read
    const mockGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => incompleteSession,
    });
    // Mock set to fail all 3 times
    const mockSet = jest.fn().mockRejectedValue(new Error("Write failed"));
    (adminDb.doc as jest.Mock).mockReturnValue({
      get: mockGet,
      set: mockSet,
      update: jest.fn(),
    });

    mockIsCacheComplete.mockReturnValue(false);

    mockFetchRestaurants.mockResolvedValue([
      { id: "r1", displayName: "New Place", rating: 4.0, photoReference: null },
    ]);

    const result = await retryFetchRestaurants(
      mockSessionId,
      mockHostUid,
      mockTagSet
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Failed to save restaurants after 3 attempts");
    }

    // fetchRestaurants should only be called ONCE (not re-fetched after write failure)
    expect(mockFetchRestaurants).toHaveBeenCalledTimes(1);
    // Firestore set should have been retried 3 times
    expect(mockSet).toHaveBeenCalledTimes(3);
  });

  it("rejects retry from non-host user", async () => {
    const mockGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => completeSession,
    });
    (adminDb.doc as jest.Mock).mockReturnValue({
      get: mockGet,
    });

    const result = await retryFetchRestaurants(
      mockSessionId,
      "not-the-host-uid",
      mockTagSet
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Only the Host can retry");
    }
    expect(mockFetchRestaurants).not.toHaveBeenCalled();
  });

  it("returns error when session does not exist", async () => {
    const mockGet = jest.fn().mockResolvedValue({
      exists: false,
    });
    (adminDb.doc as jest.Mock).mockReturnValue({
      get: mockGet,
    });

    const result = await retryFetchRestaurants(
      "nonexistent-session",
      mockHostUid,
      mockTagSet
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Session not found");
    }
  });
});
