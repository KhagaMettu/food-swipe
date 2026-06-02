/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import UndoButton from "../UndoButton";

describe("UndoButton", () => {
  const mockOnUndo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("is hidden when canUndo is false (no swipes performed)", () => {
    render(
      <UndoButton canUndo={false} isLoading={false} sessionState="active" onUndo={mockOnUndo} />
    );

    expect(screen.queryByTestId("undo-button")).not.toBeInTheDocument();
  });

  it("is visible after at least one swipe (canUndo is true)", () => {
    render(
      <UndoButton canUndo={true} isLoading={false} sessionState="active" onUndo={mockOnUndo} />
    );

    expect(screen.getByTestId("undo-button")).toBeInTheDocument();
  });

  it("is hidden when session state is 'match'", () => {
    render(
      <UndoButton canUndo={true} isLoading={false} sessionState="match" onUndo={mockOnUndo} />
    );

    expect(screen.queryByTestId("undo-button")).not.toBeInTheDocument();
  });

  it("is hidden when session state is 'no_match'", () => {
    render(
      <UndoButton canUndo={true} isLoading={false} sessionState="no_match" onUndo={mockOnUndo} />
    );

    expect(screen.queryByTestId("undo-button")).not.toBeInTheDocument();
  });

  it("is disabled while Firestore operation is in progress", () => {
    render(
      <UndoButton canUndo={true} isLoading={true} sessionState="active" onUndo={mockOnUndo} />
    );

    expect(screen.getByTestId("undo-button")).toBeDisabled();
  });

  it("triggers onUndo callback when clicked", () => {
    render(
      <UndoButton canUndo={true} isLoading={false} sessionState="active" onUndo={mockOnUndo} />
    );

    fireEvent.click(screen.getByTestId("undo-button"));
    expect(mockOnUndo).toHaveBeenCalledTimes(1);
  });
});
