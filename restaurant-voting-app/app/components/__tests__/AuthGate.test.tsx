/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AuthGate from "../AuthGate";

// Mock firebase/auth
const mockSignInAnonymously = jest.fn();
const mockOnAuthStateChanged = jest.fn();

jest.mock("firebase/auth", () => ({
  signInAnonymously: (...args: unknown[]) => mockSignInAnonymously(...args),
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
}));

jest.mock("@/app/lib/firebase", () => ({
  auth: { currentUser: null },
}));

describe("AuthGate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders children after successful auth", async () => {
    // Simulate: onAuthStateChanged fires with null user, then signInAnonymously succeeds
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      // Fire immediately with null (no existing user)
      callback(null);
      return jest.fn(); // unsubscribe
    });
    mockSignInAnonymously.mockResolvedValue({
      user: { uid: "test-uid-123" },
    });

    render(
      <AuthGate>
        <div data-testid="child">Hello World</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("renders error state with retry button on auth failure", async () => {
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return jest.fn();
    });
    mockSignInAnonymously.mockRejectedValue(
      new Error("Network error")
    );

    render(
      <AuthGate>
        <div data-testid="child">Hello World</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByText("Authentication failed")).toBeInTheDocument();
    });

    expect(screen.getByText("Network error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
  });

  it("reuses existing token without calling signInAnonymously", async () => {
    // Simulate: onAuthStateChanged fires with an existing user
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback({ uid: "existing-uid-456" });
      return jest.fn();
    });

    render(
      <AuthGate>
        <div data-testid="child">Existing User</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    // signInAnonymously should NOT have been called
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
  });

  it("retry button re-attempts authentication", async () => {
    // First attempt fails
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return jest.fn();
    });
    mockSignInAnonymously.mockRejectedValueOnce(
      new Error("Network error")
    );

    render(
      <AuthGate>
        <div data-testid="child">Hello</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByText("Authentication failed")).toBeInTheDocument();
    });

    // Now make the retry succeed
    mockSignInAnonymously.mockResolvedValueOnce({
      user: { uid: "retry-uid-789" },
    });

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });
  });
});
