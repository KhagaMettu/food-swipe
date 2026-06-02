import { createSession } from "../session";
import { parsePrompt } from "../ai-parser";
import { fetchRestaurants } from "../places-client";
import { AIParserError, PlacesAPIError } from "@/app/lib/errors";
import { validatePrompt } from "@/app/lib/validation";
import { adminDb } from "@/app/lib/firebase-admin";

// Mock dependencies
jest.mock("../ai-parser");
jest.mock("../places-client");
jest.mock("@/app/lib/validation");
jest.mock("@/app/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
    doc: jest.fn(),
  },
}));

const mockParsePrompt = parsePrompt as jest.MockedFunction<typeof parsePrompt>;
const mockFetchRestaurants = fetchRestaurants as jest.MockedFunction<
  typeof fetchRestaurants
>;
const mockValidatePrompt = validatePrompt as jest.MockedFunction<
  typeof validatePrompt
>;

describe("createSession", () => {
  const mockHostUid = "test-host-uid-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates session and returns shareUrl for valid prompt", async () => {
    // Mock validation success
    mockValidatePrompt.mockReturnValue({ valid: true });

    // Mock AI parser success
    mockParsePrompt.mockResolvedValue({
      cuisine: "Mexican",
      budget: "medium",
      groupSize: 4,
      location: "Belfast",
    });

    // Mock Places API success
    mockFetchRestaurants.mockResolvedValue([
      {
        id: "place-1",
        displayName: "Taco Palace",
        rating: 4.5,
        photoReference: "photo-ref-1",
      },
      {
        id: "place-2",
        displayName: "Burrito Bar",
        rating: 4.2,
        photoReference: null,
      },
    ]);

    // Mock Firestore write success
    const mockSet = jest.fn().mockResolvedValue(undefined);

    // adminDb.collection("sessions").doc().id generates the session ID
    const mockCollection = jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({ id: "session-123" }),
    });
    (adminDb.collection as jest.Mock) = mockCollection;

    // adminDb.doc("sessions/session-123").set(...) writes the document
    (adminDb.doc as jest.Mock) = jest.fn().mockReturnValue({ set: mockSet });

    const result = await createSession("4 friends, Mexican, medium budget", mockHostUid);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.sessionId).toBe("session-123");
      expect(result.shareUrl).toBe("/session/session-123");
    }

    expect(mockValidatePrompt).toHaveBeenCalledWith("4 friends, Mexican, medium budget");
    expect(mockParsePrompt).toHaveBeenCalledWith("4 friends, Mexican, medium budget");
    expect(mockFetchRestaurants).toHaveBeenCalledWith(
      {
        cuisine: "Mexican",
        budget: "medium",
        groupSize: 4,
        location: "Belfast",
      },
      undefined
    );
  });

  it("returns validation error without calling AI parser for empty prompt", async () => {
    mockValidatePrompt.mockReturnValue({
      valid: false,
      error: "Prompt cannot be empty.",
    });

    const result = await createSession("", mockHostUid);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Prompt cannot be empty");
    }

    expect(mockParsePrompt).not.toHaveBeenCalled();
    expect(mockFetchRestaurants).not.toHaveBeenCalled();
  });

  it("returns AIParserError when AI parser times out", async () => {
    mockValidatePrompt.mockReturnValue({ valid: true });
    mockParsePrompt.mockRejectedValue(
      new AIParserError("AI parser timeout after 10 seconds")
    );

    const result = await createSession("4 friends, pizza", mockHostUid);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Could not understand your prompt");
    }

    expect(mockFetchRestaurants).not.toHaveBeenCalled();
  });

  it("returns PlacesAPIError when Places API fails", async () => {
    mockValidatePrompt.mockReturnValue({ valid: true });
    mockParsePrompt.mockResolvedValue({
      cuisine: "Italian",
      budget: "high",
      groupSize: 2,
      location: "",
    });
    mockFetchRestaurants.mockRejectedValue(
      new PlacesAPIError("API rate limit exceeded", 429)
    );

    const result = await createSession("2 people, Italian, expensive", mockHostUid);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Could not fetch restaurants");
    }
  });

  it("retries Firestore write on failure before surfacing error", async () => {
    mockValidatePrompt.mockReturnValue({ valid: true });
    mockParsePrompt.mockResolvedValue({
      cuisine: "Japanese",
      budget: "low",
      groupSize: 3,
      location: "",
    });
    mockFetchRestaurants.mockResolvedValue([
      {
        id: "place-1",
        displayName: "Sushi Spot",
        rating: 4.0,
        photoReference: null,
      },
    ]);

    // Mock Firestore write failure (all 3 attempts fail)
    const mockSet = jest.fn().mockRejectedValue(new Error("Network error"));

    // adminDb.collection("sessions").doc().id generates the session ID
    const mockCollection = jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({ id: "session-456" }),
    });
    (adminDb.collection as jest.Mock) = mockCollection;

    // adminDb.doc("sessions/session-456").set(...) fails
    (adminDb.doc as jest.Mock) = jest.fn().mockReturnValue({ set: mockSet });

    const result = await createSession("3 friends, sushi, cheap", mockHostUid);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Failed to create session after 3 attempts");
    }

    // Verify 3 retry attempts were made
    expect(mockSet).toHaveBeenCalledTimes(3);
  });
});
