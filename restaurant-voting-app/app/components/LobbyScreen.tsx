"use client";

import React, { useEffect, useState, useTransition } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { useAuth } from "@/app/context/AuthContext";
import { startSession } from "@/app/actions/session";
import type { Session } from "@/types";

interface LobbyScreenProps {
  sessionId: string;
  session: Session;
}

/**
 * LobbyScreen — displayed while the session is in "lobby" state.
 *
 * Features:
 * - Displays session name (derived from host prompt or session ID)
 * - Live participant count via onSnapshot on participants/ subcollection
 * - Updates count within 2 seconds of any join/leave
 * - Shows a loading indicator while restaurant data is being fetched
 */
export default function LobbyScreen({ sessionId, session }: LobbyScreenProps) {
  const { uid } = useAuth();
  const [participantCount, setParticipantCount] = useState(0);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [startError, setStartError] = useState<string | null>(null);

  const isHost = uid === session.hostUid;

  // Subscribe to participants subcollection for live count
  useEffect(() => {
    const participantsRef = collection(
      db,
      "sessions",
      sessionId,
      "participants"
    );

    const unsubscribe = onSnapshot(
      participantsRef,
      (snapshot) => {
        // Count only active participants
        const activeCount = snapshot.docs.filter(
          (doc) => doc.data().active !== false
        ).length;
        setParticipantCount(activeCount);
        setLoadingParticipants(false);
      },
      (err) => {
        console.error("Participants snapshot error:", err);
        setLoadingParticipants(false);
      }
    );

    return () => unsubscribe();
  }, [sessionId]);

  const hasRestaurants = session.restaurants && session.restaurants.length > 0;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16" style={{ background: "linear-gradient(180deg, #8ECAE6 0%, #219EBC 100%)" }}>
      <div className="w-full max-w-md text-center">
        {/* Session header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#023047]">
            🍽️ Waiting for everyone
          </h1>
          <p className="mt-2 text-sm text-[#023047]/70">
            Share the link to invite friends to this session
          </p>
        </div>

        {/* Share URL */}
        <div className="mb-6 rounded-2xl bg-white/90 backdrop-blur-sm shadow-lg p-4">
          <p className="text-xs font-medium text-[#219EBC] uppercase tracking-wide mb-1">
            Share this link
          </p>
          <p className="text-sm font-mono text-[#023047] break-all select-all">
            {typeof window !== "undefined"
              ? `${window.location.origin}/session/${sessionId}`
              : `/session/${sessionId}`}
          </p>
        </div>

        {/* Participant count */}
        <div className="mb-6 rounded-2xl bg-white/90 backdrop-blur-sm shadow-lg p-6">
          <div className="flex items-center justify-center gap-2">
            {loadingParticipants ? (
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#219EBC] border-t-transparent"
                aria-hidden="true"
              />
            ) : (
              <span
                className="text-3xl font-bold text-[#023047]"
                aria-live="polite"
              >
                {participantCount}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#023047]/70">
            {participantCount === 1 ? "participant" : "participants"} joined
          </p>
        </div>

        {/* Restaurant loading state */}
        {!hasRestaurants && (
          <div className="flex items-center justify-center gap-2 text-sm text-[#023047]/70">
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#219EBC] border-t-transparent"
              aria-hidden="true"
            />
            Loading restaurant data…
          </div>
        )}

        {hasRestaurants && (
          <p className="text-sm text-[#219EBC] font-medium">
            ✓ {session.restaurants.length} restaurants ready
          </p>
        )}

        {/* Start Voting button — only visible to the Host when restaurants are ready */}
        {isHost && hasRestaurants && (
          <div className="mt-6">
            <button
              onClick={() => {
                setStartError(null);
                startTransition(async () => {
                  if (!uid) return;
                  const result = await startSession(sessionId, uid);
                  if (!result.success) {
                    setStartError(result.error || "Failed to start session");
                  }
                });
              }}
              disabled={isPending}
              aria-busy={isPending}
              className={[
                "rounded-xl px-8 py-3 text-sm font-semibold transition-colors",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB703]",
                isPending
                  ? "cursor-not-allowed bg-[#8ECAE6]/40 text-[#023047]/40"
                  : "bg-[#FFB703] text-[#023047] hover:bg-[#FB8500] active:bg-[#FB8500]",
              ].join(" ")}
            >
              {isPending ? "Starting…" : "Start Voting"}
            </button>
            {startError && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {startError}
              </p>
            )}
          </div>
        )}

        {!isHost && hasRestaurants && (
          <p className="mt-4 text-sm text-[#023047]/60">
            Waiting for the host to start voting…
          </p>
        )}
      </div>
    </main>
  );
}
