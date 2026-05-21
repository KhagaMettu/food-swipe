/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import SessionPage from "../[sessionId]/page";
import { AuthContext } from "@/app/context/AuthContext";

// --- Mocks ---

// Mock next/navigation
const mockParams = { sessionId: "test-session-123" };
jest.mock("next/navigation", () => ({
  useParams: () => mockParams,
}));

// Mock firebase/firestore
const mockOnSnapshot = jest.fn();
const mockSetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockDoc = jest.fn((...args: unknown[]) => ({
  path: args.join("/"),
}));
const mockCollection = jest.fn((...args: unknown[]) => ({
  path: args.join("/"),
}));
const mockServerTimestamp = jest.fn(() => "mock-timestamp");

jest.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

jest.mock("@/app/lib/firebase", () => ({
  db: {},
}));

// Mock LobbyScreen
jest.mock("@/app/components/LobbyScreen", () => {
  return function MockLobbyScreen() {
    return <div data-testid="lobby-screen">Lobby Screen</div>;
  };
});

// Mock SwipeDeck
jest.mock("@/app/components/SwipeDeck", () => {
  return function MockSwipeDeck() {
    return <div data-testid="swipe-deck">Swipe Deck</div>;
  };
});

// Mock WaitingScreen
jest.mock("@/app/components/WaitingScreen", () => {
  return function MockWaitingScreen() {
    return <div data-testid="waiting-screen">Waiting for others…</div>;
  };
});

// Mock ErrorScreen
jest.mock("@/app/components/ErrorScreen", () => {
  return function MockErrorScreen() {
    return <div data-testid="error-screen">Error Screen</div>;
  };
});

// Mock MatchScreen
jest.mock("@/app/components/MatchScreen", () => {
  return function MockMatchScreen({ restaurant }: any) {
    return <div data-testid="match-screen">Match: {restaurant?.displayName}</div>;
  };
});

// Mock NoMatchScreen
jest.mock("@/app/components/NoMatchScreen", () => {
  return function MockNoMatchScreen() {
    return <div data-testid="no-match-screen">No match found</div>;
  };
});

// Mock match utility
jest.mock("@/app/lib/match", () => ({
  checkForMatch: jest.fn(() => null),
}));

// Helper to render with auth context
function renderWithAuth(
  uid: string | null = "test-uid-456",
  loading = false
) {
  return render(
    <AuthContext.Provider value={{ uid, authError: null, loading }}>
      <SessionPage />
    </AuthContext.Provider>
  );
}

describe("SessionPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: getDocs returns empty participants
    mockGetDocs.mockResolvedValue({
      docs: [],
      size: 0,
    });
    // Default: setDoc succeeds
    mockSetDoc.mockResolvedValue(undefined);
  });

  it("renders LobbyScreen for lobby state", async () => {
    // Mock onSnapshot to fire with a session in lobby state
    mockOnSnapshot.mockImplementation((ref, onNext) => {
      onNext({
        exists: () => true,
        data: () => ({
          id: "test-session-123",
          hostUid: "host-uid",
          state: "lobby",
          restaurants: [],
          matchedRestaurantId: null,
          createdAt: new Date(),
        }),
      });
      return jest.fn(); // unsubscribe
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId("lobby-screen")).toBeInTheDocument();
    });
  });

  it('renders "Session not found" for missing session', async () => {
    mockOnSnapshot.mockImplementation((ref, onNext) => {
      onNext({
        exists: () => false,
        data: () => null,
      });
      return jest.fn();
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByText("Session not found")).toBeInTheDocument();
    });
  });

  it("renders Match screen for match state", async () => {
    mockOnSnapshot.mockImplementation((ref, onNext) => {
      onNext({
        exists: () => true,
        data: () => ({
          id: "test-session-123",
          hostUid: "host-uid",
          state: "match",
          restaurants: [
            { id: "r1", displayName: "Pizza Place", rating: 4.5, photoReference: null },
          ],
          matchedRestaurantId: "r1",
          createdAt: new Date(),
        }),
      });
      return jest.fn();
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId("match-screen")).toBeInTheDocument();
    });
  });

  it("registers participant exactly once on multiple renders", async () => {
    mockOnSnapshot.mockImplementation((ref, onNext) => {
      onNext({
        exists: () => true,
        data: () => ({
          id: "test-session-123",
          hostUid: "host-uid",
          state: "lobby",
          restaurants: [],
          matchedRestaurantId: null,
          createdAt: new Date(),
        }),
      });
      return jest.fn();
    });

    const { rerender } = render(
      <AuthContext.Provider
        value={{ uid: "test-uid-456", authError: null, loading: false }}
      >
        <SessionPage />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
    });

    // Re-render (simulating navigation back to same page)
    rerender(
      <AuthContext.Provider
        value={{ uid: "test-uid-456", authError: null, loading: false }}
      >
        <SessionPage />
      </AuthContext.Provider>
    );

    // Should still only have been called once
    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
    });
  });

  it("rejects 11th participant with session full message", async () => {
    mockOnSnapshot.mockImplementation((ref, onNext) => {
      onNext({
        exists: () => true,
        data: () => ({
          id: "test-session-123",
          hostUid: "host-uid",
          state: "lobby",
          restaurants: [],
          matchedRestaurantId: null,
          createdAt: new Date(),
        }),
      });
      return jest.fn();
    });

    // Mock getDocs to return 10 existing participants
    mockGetDocs.mockResolvedValue({
      docs: Array.from({ length: 10 }, (_, i) => ({
        id: `uid-${i}`,
        data: () => ({ uid: `uid-${i}`, active: true }),
      })),
      size: 10,
    });

    renderWithAuth("new-uid-11");

    await waitFor(() => {
      expect(screen.getByText("Session is full")).toBeInTheDocument();
    });

    // setDoc should NOT have been called for registration
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});
