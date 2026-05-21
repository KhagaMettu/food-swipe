"use client";

import React from "react";

/**
 * WaitingScreen — displayed after a participant has swiped all cards.
 * Shows a "Waiting for others…" message while other participants finish voting.
 */
export default function WaitingScreen() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4" style={{ background: "linear-gradient(180deg, #8ECAE6 0%, #219EBC 100%)" }}>
      <div className="rounded-2xl bg-white/90 backdrop-blur-sm shadow-xl p-8 text-center max-w-sm w-full">
        <div className="mb-4">
          <span
            className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#8ECAE6] border-t-[#023047]"
            aria-hidden="true"
          />
        </div>
        <h1 className="text-xl font-semibold text-[#023047]">
          Waiting for others…
        </h1>
        <p className="mt-2 text-sm text-[#023047]/70 max-w-xs mx-auto">
          You&apos;ve finished voting. We&apos;ll show the result as soon as
          everyone is done.
        </p>
      </div>
    </main>
  );
}
