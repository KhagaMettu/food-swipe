/**
 * Integration tests: Session Creation end-to-end
 *
 * These tests validate the full session creation flow against mocked services.
 * In CI, they would run against the Firebase Emulator Suite.
 */

import { createSession } from "@/app/actions/session";
import { parsePrompt } from "@/app/actions/ai-parser";
import { fetchRestaurants } from "@/app/actions/places-client";
import { adminDb } from "@/app/lib/firebase-admin";

jest.mock("@/app/actions/ai-parser");
jest.mock("@/app/actions/places-client");
jest.mock("@/app/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
    doc: jest.fn(),
  },
}));

const mockParsePrompt = parsePrompt as jest.MockedFunction<typeof parsePrompt>;
const mockFetchRestaurants = fetchRestaurants as jest.MockedFunction<typeof fetchRestaurants>;

describe("Integration: Session Creation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("prompt → TagSet → restaurants → Firestore document (full flow)", async () => {
    // Mock AI parser
    mockParsePrompt.mockResolvedValue({
      cuisine: "Italian",
      budget: "medium",
      groupSize: 4,
      location: "Belfast",
    });

    // Mock Places API
    const mockRestaurants = [
      { id: "r1", displayName: "Pasta Palace", rating: 4.5, photoReference: "https://photo1.jpg" },
      { id: "r2", displayName: "Pizza Hut", rating: 4.0, photoReference: "https://photo2.jpg" },
      { id: "r3", displayName: "Olive Garden", rating: 3.8, photoReference: null },
    ];
    mockFetchRestaurants.mockResolvedValue(mockRestaurants);

    // Mock Firestore
    const mockSet = jest.fn().mockResolvedValue(undefined);
    (adminDb.collection as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({ id: "integration-session-1" }),
    });
    (adminDb.doc as jest.Mock).mockReturnValue({ set: mockSet });

    // Execute
    const result = await createSession("4 friends, Italian, Belfast, medium budget", "host-uid-1");

    // Verify full flow
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.sessionId).toBe("integration-session-1");
      expect(result.shareUrl).toBe("/session/integration-session-1");
    }

    // Verify AI parser was called with trimmed prompt
    expect(mockParsePrompt).toHaveBeenCalledWith("4 friends, Italian, Belfast, medium budget");

    // Verify Places API was called with parsed TagSet
    expect(mockFetchRestaurants).toHaveBeenCalledWith(
      {
        cuisine: "Italian",
        budget: "medium",
        groupSize: 4,
        location: "Belfast",
      },
      undefined,
      undefined
    );

    // Verify Firestore document was written with correct structure
    expect(mockSet).toHaveBeenCalledTimes(1);
    const writtenData = mockSet.mock.calls[0][0];
    expect(writtenData.id).toBe("integration-session-1");
    expect(writtenData.hostUid).toBe("host-uid-1");
    expect(writtenData.state).toBe("lobby");
    expect(writtenData.restaurants).toEqual(mockRestaurants);
    expect(writtenData.matchedRestaurantId).toBeNull();
    expect(writtenData.createdAt).toBeInstanceOf(Date);
  });
});
