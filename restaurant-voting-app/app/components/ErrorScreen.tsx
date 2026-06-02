"use client";

import React, { useState, useTransition } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { retryFetchRestaurants } from "@/app/actions/session";
import type { Session } from "@/types";

interface ErrorScreenProps {
  sessionId: string;
  session: Session;
}

/**
 * ErrorScreen — displayed when session.state === "error".
 *
 * Shows an error message and a retry button for the Host.
 * Non-host participants see a waiting message.
 */
export default function ErrorScreen({ sessionId, session }: ErrorScreenProps) {
  const { uid } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [retryError, setRetryError] = useState<string | null>(null);

  const isHost = uid === session.hostUid;

  function handleRetry() {
    if (!isHost || !uid) return;

    setRetryError(null);
    startTransition(async () => {
      try {
        // Use a default tagSet for retry — in a full implementation this would
        // be stored on the session document. For now we pass a reasonable default.
        const result = await retryFetchRestaurants(sessionId, uid, {
          cuisine: "restaurant",
          budget: "medium",
          groupSize: 2,
          location: "",
        });

        if (!result.success) {
          setRetryError(result.error);
        }
      } catch (err) {
        setRetryError(
          err instanceof Error ? err.message : "Retry failed. Please try again."
        );
      }
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4" style={{ background: "linear-gradient(180deg, #8ECAE6 0%, #219EBC 100%)" }}>
      <div className="w-full max-w-sm text-center rounded-2xl bg-white/90 backdrop-blur-sm shadow-xl p-8">
        <div className="mb-4">
          <span className="text-4xl" aria-hidden="true">⚠️</span>
        </div>
        <h1 className="text-xl font-semibold text-[#023047]">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-[#023047]/70">
          There was an error loading restaurant data.
        </p>

        {isHost ? (
          <div className="mt-6">
            <button
              onClick={handleRetry}
              disabled={isPending}
              aria-busy={isPending}
              className={[
                "rounded-xl px-6 py-3 text-sm font-semibold transition-colors min-h-[44px]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB703]",
                isPending
                  ? "cursor-not-allowed bg-[#8ECAE6]/40 text-[#023047]/40"
                  : "bg-[#FFB703] text-[#023047] hover:bg-[#FB8500] active:bg-[#FB8500]",
              ].join(" ")}
              data-testid="retry-button"
            >
              {isPending ? "Retrying…" : "Retry"}
            </button>

            {retryError && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {retryError}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#023047]/60">
            Waiting for the host to retry…
          </p>
        )}
      </div>
    </main>
  );
}
