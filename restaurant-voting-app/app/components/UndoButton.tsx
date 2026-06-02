"use client";

import React from "react";

interface UndoButtonProps {
  /** Whether there is a swipe to undo */
  canUndo: boolean;
  /** Whether a Firestore operation is in progress */
  isLoading: boolean;
  /** Current session state */
  sessionState?: string;
  /** Callback to trigger undo */
  onUndo: () => void;
}

/**
 * UndoButton — allows the participant to reverse their most recent swipe.
 *
 * - Visible only when `canUndo` is true (at least one swipe performed)
 * - Hidden when session state is "match" or "no_match"
 * - Disabled while a Firestore operation is in progress
 * - Min 44×44px touch target (WCAG 2.5.5)
 */
export default function UndoButton({
  canUndo,
  isLoading,
  sessionState,
  onUndo,
}: UndoButtonProps) {
  // Hidden when session has concluded
  if (sessionState === "match" || sessionState === "no_match") {
    return null;
  }

  // Hidden when there's nothing to undo
  if (!canUndo) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onUndo}
      disabled={isLoading}
      aria-label="Undo last swipe"
      data-testid="undo-button"
      className="mt-4 flex items-center justify-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-[#023047] shadow-md backdrop-blur-sm transition-opacity hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
      style={{ minWidth: "44px", minHeight: "44px" }}
    >
      <span aria-hidden="true">↩</span>
      <span>Undo</span>
    </button>
  );
}
