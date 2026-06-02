/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import WaitingScreen from "../WaitingScreen";
import type { Restaurant } from "@/types";

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

const mockRestaurants: Restaurant[] = [
  { id: "r1", displayName: "Pizza Place", rating: 4.5, photoReference: null },
  { id: "r2", displayName: "Sushi Spot", rating: 4.2, photoReference: null },
  { id: "r3", displayName: "Taco Town", rating: 3.9, photoReference: null },
];

describe("WaitingScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setupSnapshots(
    participantsDocs: any[],
    votesDocs: any[]
  ) {
    let callCount = 0;
    mockOnSnapshot.mockImplementation((_, callback) => {
      callCount++;
      if (callCount === 1) {
        // participants snapshot - invoke immediately
        callback({ docs: participantsDocs });
      } else {
        // votes snapshot - invoke immediately
        callback({ docs: votesDocs });
      }
      return jest.fn();
    });
  }

  it("renders participant progress with vote counts", () => {
    setupSnapshots(
      [
        { id: "user1", data: () => ({ displayName: "Hungry Panda", active: true }) },
        { id: "user2", data: () => ({ displayName: "Spicy Falcon", active: true }) },
      ],
      [
        { id: "user1", data: () => ({ r1: "accept", r2: "reject" }) },
        { id: "user2", data: () => ({ r1: "accept" }) },
      ]
    );

    render(<WaitingScreen sessionId="session-1" restaurants={mockRestaurants} />);

    expect(screen.getByText("Hungry Panda")).toBeInTheDocument();
    expect(screen.getByText("Spicy Falcon")).toBeInTheDocument();
    expect(screen.getByText("2/3")).toBeInTheDocument();
    expect(screen.getByText("1/3")).toBeInTheDocument();
  });

  it("shows 'Almost there…' when only one participant remains", () => {
    setupSnapshots(
      [
        { id: "user1", data: () => ({ displayName: "Hungry Panda", active: true }) },
        { id: "user2", data: () => ({ displayName: "Spicy Falcon", active: true }) },
      ],
      [
        { id: "user1", data: () => ({ r1: "accept", r2: "reject", r3: "accept" }) },
        { id: "user2", data: () => ({ r1: "accept", r2: "reject" }) },
      ]
    );

    render(<WaitingScreen sessionId="session-1" restaurants={mockRestaurants} />);

    expect(screen.getByText("Almost there…")).toBeInTheDocument();
  });

  it("shows 'Disconnected' for inactive participants", () => {
    setupSnapshots(
      [
        { id: "user1", data: () => ({ displayName: "Hungry Panda", active: true }) },
        { id: "user2", data: () => ({ displayName: "Spicy Falcon", active: false }) },
      ],
      []
    );

    render(<WaitingScreen sessionId="session-1" restaurants={mockRestaurants} />);

    expect(screen.getByText("(Disconnected)")).toBeInTheDocument();
  });
});
