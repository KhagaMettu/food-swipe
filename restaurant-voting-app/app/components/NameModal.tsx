"use client";

import React, { useState } from "react";
import {
  generateRandomName,
  isNameAllowed,
  sanitizeDisplayName,
} from "@/app/lib/display-names";

interface NameModalProps {
  uid: string;
  onSubmit: (displayName: string) => void;
  onSkip: () => void;
}

/**
 * NameModal — prompts a participant to choose a display name when joining a session.
 *
 * Features:
 * - Text input with max 20 characters and character counter
 * - "Random Name" button for fun auto-generated names
 * - Profanity filter with inline error
 * - "Join" submit and "Skip" dismiss buttons
 */
export default function NameModal({ uid, onSubmit, onSkip }: NameModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeDisplayName(e.target.value);
    setName(sanitized);
    setError(null);
  };

  const handleRandomName = () => {
    const randomName = generateRandomName();
    setName(randomName);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      setError("Please enter a name or use a random one.");
      return;
    }

    if (!isNameAllowed(trimmed)) {
      setError("That name is not allowed. Please choose another.");
      return;
    }

    onSubmit(trimmed);
  };

  const handleSkip = () => {
    const fallback = `Anonymous${uid.slice(-4)}`;
    onSkip();
    onSubmit(fallback);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="name-modal-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2
          id="name-modal-title"
          className="text-lg font-bold text-[#023047] text-center mb-1"
        >
          Choose a display name
        </h2>
        <p className="text-sm text-[#023047]/70 text-center mb-4">
          Others in the session will see this name.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <input
              type="text"
              value={name}
              onChange={handleChange}
              maxLength={20}
              placeholder="Enter your name"
              autoFocus
              className="w-full rounded-lg border border-[#8ECAE6] px-3 py-2 text-sm text-[#023047] placeholder:text-[#023047]/40 focus:outline-none focus:ring-2 focus:ring-[#219EBC]"
              aria-describedby="name-char-count name-error"
            />
            <div className="mt-1 flex items-center justify-between">
              <span
                id="name-char-count"
                className="text-xs text-[#023047]/50"
              >
                {name.length}/20
              </span>
              {error && (
                <span
                  id="name-error"
                  className="text-xs text-red-600"
                  role="alert"
                >
                  {error}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleRandomName}
            className="mb-4 w-full rounded-lg border border-[#219EBC] px-3 py-2 text-sm font-medium text-[#219EBC] hover:bg-[#8ECAE6]/10 transition-colors"
          >
            🎲 Random Name
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-[#023047]/70 hover:bg-[#8ECAE6]/10 transition-colors"
            >
              Skip
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-[#FFB703] px-3 py-2 text-sm font-semibold text-[#023047] hover:bg-[#FB8500] transition-colors"
            >
              Join
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
