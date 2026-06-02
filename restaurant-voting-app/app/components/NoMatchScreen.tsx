"use client";

import React from "react";
import { useRouter } from "next/navigation";

/**
 * NoMatchScreen — displayed when all cards are swiped with no unanimous match.
 *
 * Shows a "No match found" message and a "Start New Session" button
 * that navigates back to the home page.
 */
export default function NoMatchScreen() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4" style={{ background: "linear-gradient(180deg, #8ECAE6 0%, #219EBC 100%)" }}>
      <div className="w-full max-w-sm text-center rounded-2xl bg-white/90 backdrop-blur-sm shadow-xl p-8">
        <div className="mb-6">
          <span className="text-5xl" aria-hidden="true">😔</span>
        </div>
        <h1 className="text-xl font-semibold text-[#023047]">No match found</h1>
        <p className="mt-2 text-sm text-[#023047]/70 max-w-xs mx-auto">
          No restaurant received unanimous approval from all participants.
          Try again with different preferences!
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 rounded-xl bg-[#FFB703] px-8 py-3 text-sm font-semibold text-[#023047] hover:bg-[#FB8500] transition-colors min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB703]"
        >
          Start New Session
        </button>
      </div>
    </main>
  );
}
