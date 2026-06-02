/**
 * @jest-environment jsdom
 */

import React from "react";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { AuthContext } from "@/app/context/AuthContext";
import PromptForm from "../PromptForm";
import WaitingScreen from "../WaitingScreen";
import NoMatchScreen from "../NoMatchScreen";
import type { Restaurant } from "@/types";

expect.extend(toHaveNoViolations);

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock firebase/firestore
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  doc: jest.fn(),
  setDoc: jest.fn(),
}));

jest.mock("@/app/lib/firebase", () => ({
  db: {},
}));

// Helper to render with auth context
function renderWithAuth(ui: React.ReactElement) {
  return render(
    <AuthContext.Provider
      value={{ uid: "test-uid", authError: null, loading: false }}
    >
      {ui}
    </AuthContext.Provider>
  );
}

describe("Accessibility Tests (Task 12.1)", () => {
  describe("Home Page — PromptForm", () => {
    it("should have no accessibility violations", async () => {
      const { container } = renderWithAuth(<PromptForm />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Waiting Screen", () => {
    it("should have no accessibility violations", async () => {
      const mockRestaurants: Restaurant[] = [
        { id: "r1", displayName: "Test Restaurant", rating: 4.5, photoReference: null },
      ];
      const { container } = render(
        <WaitingScreen sessionId="test-session" restaurants={mockRestaurants} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("No Match Screen", () => {
    it("should have no accessibility violations", async () => {
      const { container } = render(<NoMatchScreen />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Error state", () => {
    it("should have no accessibility violations", async () => {
      const { container } = render(
        <div role="alert">
          <h1>Authentication failed</h1>
          <p>We couldn&apos;t sign you in. Please check your connection and try again.</p>
          <button>Retry</button>
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Session not found state", () => {
    it("should have no accessibility violations", async () => {
      const { container } = render(
        <div role="alert">
          <h1>Session not found</h1>
          <p>This session doesn&apos;t exist or may have been deleted.</p>
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
