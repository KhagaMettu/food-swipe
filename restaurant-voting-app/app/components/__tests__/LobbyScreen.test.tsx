/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import LobbyScreen from "../LobbyScreen";
import { AuthContext } from "@/app/context/AuthContext";
import type { Session } from "@/types";

// Mock firebase/firestore
const mockOnSnapshot = jest.fn();
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  onSnapshot: (...args: unknown[]) => {
    mockOnSnapshot(...args);
    return jest.fn(); // unsubscribe
  },
}));

jest.mock("@/app/lib/firebase", () => ({ db: {} }));

// Mock server actions
jest.mock("@/app/actions/session", () => ({
  startSession: jest.fn().mockResolvedValue({ success: true }),
  cancelSession: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock QRCodeDisplay and ShareButtons to simplify
jest.mock("@/app/components/QRCodeDisplay", () => {
  return function MockQRCode({ url }: { url: string }) {
    return <div data-testid="qr-code">{url}</div>;
  };
});

jest.mock("@/app/components/ShareButtons", () => {
  return function MockShareButtons({ url }: { url: string }) {
    return <div data-testid="share-buttons">{url}</div>;
  };
});

const mockSession: Session = {
  id: "session-1",
  hostUid: "host-uid",
  state: "lobby",
  restaurants: [
    { id: "r1", displayName: "Pizza Place", rating: 4.5, photoReference: null },
  ],
  matchedRestaurantId: null,
  createdAt: { seconds: 0, nanoseconds: 0 } as any,
};

function renderWithAuth(ui: React.ReactElement, uid = "host-uid") {
  return render(
    <AuthContext.Provider value={{ uid, authError: null, loading: false }}>
      {ui}
    </AuthContext.Provider>
  );
}

describe("LobbyScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Simulate onSnapshot returning participants
    mockOnSnapshot.mockImplementation((_, callback) => {
      callback({
        docs: [
          {
            id: "host-uid",
            data: () => ({ displayName: "Hungry Panda", active: true }),
          },
          {
            id: "user-2",
            data: () => ({ displayName: "Spicy Falcon", active: true }),
          },
        ],
      });
      return jest.fn();
    });
  });

  it("renders participant display names", () => {
    renderWithAuth(<LobbyScreen sessionId="session-1" session={mockSession} />);

    expect(screen.getByText("Hungry Panda")).toBeInTheDocument();
    expect(screen.getByText("Spicy Falcon")).toBeInTheDocument();
  });

  it("renders QR code component", () => {
    renderWithAuth(<LobbyScreen sessionId="session-1" session={mockSession} />);

    expect(screen.getByTestId("qr-code")).toBeInTheDocument();
  });

  it("renders share buttons", () => {
    renderWithAuth(<LobbyScreen sessionId="session-1" session={mockSession} />);

    expect(screen.getByTestId("share-buttons")).toBeInTheDocument();
  });

  it("shows participant count", () => {
    renderWithAuth(<LobbyScreen sessionId="session-1" session={mockSession} />);

    expect(screen.getByText("2 participants joined")).toBeInTheDocument();
  });

  it("shows disabled Start Voting button with tooltip when fewer than 2 participants", () => {
    mockOnSnapshot.mockImplementation((_, callback) => {
      callback({
        docs: [
          {
            id: "host-uid",
            data: () => ({ displayName: "Hungry Panda", active: true }),
          },
        ],
      });
      return jest.fn();
    });

    renderWithAuth(<LobbyScreen sessionId="session-1" session={mockSession} />);

    const startButton = screen.getByRole("button", { name: /start voting/i });
    expect(startButton).toBeDisabled();
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      /need at least 2 participants/i
    );
  });

  it("shows Cancel Session button for host", () => {
    renderWithAuth(<LobbyScreen sessionId="session-1" session={mockSession} />);

    expect(screen.getByRole("button", { name: /cancel session/i })).toBeInTheDocument();
  });

  it("does not show Cancel Session button for non-host", () => {
    renderWithAuth(
      <LobbyScreen sessionId="session-1" session={mockSession} />,
      "other-uid"
    );

    expect(screen.queryByRole("button", { name: /cancel session/i })).not.toBeInTheDocument();
  });
});
