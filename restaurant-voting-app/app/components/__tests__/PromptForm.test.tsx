/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PromptForm from "../PromptForm";
import { AuthContext } from "@/app/context/AuthContext";

// Helper to render PromptForm with a given auth state
function renderWithAuth(
  ui: React.ReactElement,
  authValue = { uid: "test-uid", authError: null, loading: false }
) {
  return render(
    <AuthContext.Provider value={authValue}>{ui}</AuthContext.Provider>
  );
}

describe("PromptForm", () => {
  it("renders correctly with textarea, counter, and submit button", () => {
    renderWithAuth(<PromptForm />);

    expect(screen.getByLabelText(/dining preferences/i)).toBeInTheDocument();
    expect(screen.getByText("0/500")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /find restaurants/i })
    ).toBeInTheDocument();
  });

  it("shows validation error on empty submit", () => {
    renderWithAuth(<PromptForm />);

    fireEvent.click(screen.getByRole("button", { name: /find restaurants/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      /prompt cannot be empty/i
    );
  });

  it("shows validation error on >500 char input", () => {
    renderWithAuth(<PromptForm />);

    const textarea = screen.getByLabelText(/dining preferences/i);
    const longText = "a".repeat(501);
    fireEvent.change(textarea, { target: { value: longText } });
    fireEvent.click(screen.getByRole("button", { name: /find restaurants/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/500 characters/i);
  });

  it("disables submit button when auth is loading", () => {
    renderWithAuth(<PromptForm />, {
      uid: null,
      authError: null,
      loading: true,
    });

    expect(
      screen.getByRole("button", { name: /find restaurants/i })
    ).toBeDisabled();
  });

  it("disables submit button when auth has failed", () => {
    renderWithAuth(<PromptForm />, {
      uid: null,
      authError: new Error("Auth failed"),
      loading: false,
    });

    expect(
      screen.getByRole("button", { name: /find restaurants/i })
    ).toBeDisabled();
  });

  it("displays server error message from onSubmit", async () => {
    const mockSubmit = jest
      .fn()
      .mockResolvedValue("Session creation failed: AI timeout");

    renderWithAuth(<PromptForm onSubmit={mockSubmit} />);

    const textarea = screen.getByLabelText(/dining preferences/i);
    fireEvent.change(textarea, { target: { value: "4 friends, pizza" } });
    fireEvent.click(screen.getByRole("button", { name: /find restaurants/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /session creation failed/i
      );
    });
  });

  it("shows loading state while server action is in flight", async () => {
    // Create a promise that we control
    let resolveSubmit: (value: string | null) => void;
    const submitPromise = new Promise<string | null>((resolve) => {
      resolveSubmit = resolve;
    });
    const mockSubmit = jest.fn().mockReturnValue(submitPromise);

    renderWithAuth(<PromptForm onSubmit={mockSubmit} />);

    const textarea = screen.getByLabelText(/dining preferences/i);
    fireEvent.change(textarea, { target: { value: "4 friends, sushi" } });
    fireEvent.click(screen.getByRole("button", { name: /find restaurants/i }));

    // The button should show loading text
    await waitFor(() => {
      expect(screen.getByText(/finding restaurants/i)).toBeInTheDocument();
    });

    // Resolve the promise
    resolveSubmit!(null);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /find restaurants/i })
      ).toBeInTheDocument();
    });
  });

  it("updates character counter as user types", () => {
    renderWithAuth(<PromptForm />);

    const textarea = screen.getByLabelText(/dining preferences/i);
    fireEvent.change(textarea, { target: { value: "hello" } });

    expect(screen.getByText("5/500")).toBeInTheDocument();
  });
});
