"use client";

import React, { useEffect, useState, useTransition, useCallback } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { useAuth } from "@/app/context/AuthContext";
import { startSession, cancelSession } from "@/app/actions/session";
import QRCodeDisplay from "@/app/components/QRCodeDisplay";
import ShareButtons from "@/app/components/ShareButtons";
import type { Session } from "@/types";

interface ParticipantInfo {
  uid: string;
  displayName: string;
  active: boolean;
}

/**
 * Derives a deterministic background color from a UID string.
 */
function avatarColor(uid: string): string {
  const colors = [
    "#219EBC",
    "#FFB703",
    "#FB8500",
    "#8ECAE6",
    "#023047",
    "#E63946",
    "#457B9D",
    "#2A9D8F",
    "#E9C46A",
    "#264653",
  ];
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) | 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

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
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [startError, setStartError] = useState<string | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const isHost = uid === session.hostUid;
  const participantCount = participants.length;

  // Subscribe to participants subcollection for live list
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
        const list: ParticipantInfo[] = snapshot.docs
          .filter((doc) => doc.data().active !== false)
          .map((doc) => {
            const data = doc.data();
            return {
              uid: doc.id,
              displayName: data.displayName || `Anonymous${doc.id.slice(-4)}`,
              active: data.active !== false,
            };
          });
        setParticipants(list);
        setLoadingParticipants(false);
      },
      (err) => {
        console.error("Participants snapshot error:", err);
        setLoadingParticipants(false);
      }
    );

    return () => unsubscribe();
  }, [sessionId]);

  // Countdown logic: count down 3→2→1 then start session
  useEffect(() => {
    if (!showCountdown) return;

    if (countdownValue <= 0) {
      // Countdown finished — start the session
      startTransition(async () => {
        if (!uid) return;
        const result = await startSession(sessionId, uid);
        if (!result.success) {
          setStartError(result.error || "Failed to start session");
          setShowCountdown(false);
          setCountdownValue(3);
        }
      });
      return;
    }

    const timer = setTimeout(() => {
      setCountdownValue((v) => v - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [showCountdown, countdownValue, sessionId, uid]);

  // Cancel session handler
  const handleCancel = useCallback(async () => {
    if (!uid) return;
    setCancelPending(true);
    setCancelError(null);
    try {
      const result = await cancelSession(sessionId, uid);
      if (!result.success) {
        setCancelError(result.error || "Failed to cancel session");
      }
      // On success, the onSnapshot in SessionPage will detect state="cancelled"
      // and redirect to cancellation screen. Host redirect is handled there.
    } catch {
      setCancelError("Failed to cancel session");
    } finally {
      setCancelPending(false);
    }
  }, [uid, sessionId]);

  const hasRestaurants = session.restaurants && session.restaurants.length > 0;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16 relative" style={{ background: "linear-gradient(180deg, #8ECAE6 0%, #219EBC 100%)" }}>
      {/* Countdown overlay */}
      {showCountdown && countdownValue > 0 && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#023047]/80 backdrop-blur-sm">
          <p className="text-6xl font-bold text-white animate-pulse">
            Starting in {countdownValue}…
          </p>
        </div>
      )}
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
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-mono text-[#023047] break-all select-all flex-1">
              {typeof window !== "undefined"
                ? `${window.location.origin}/session/${sessionId}`
                : `/session/${sessionId}`}
            </p>
            <ShareButtons
              url={
                typeof window !== "undefined"
                  ? `${window.location.origin}/session/${sessionId}`
                  : `/session/${sessionId}`
              }
            />
          </div>
        </div>

        {/* QR Code */}
        <div className="mb-6 flex justify-center">
          <QRCodeDisplay
            url={
              typeof window !== "undefined"
                ? `${window.location.origin}/session/${sessionId}`
                : `/session/${sessionId}`
            }
          />
        </div>

        {/* Participant list */}
        <div className="mb-6 rounded-2xl bg-white/90 backdrop-blur-sm shadow-lg p-6">
          {loadingParticipants ? (
            <div className="flex items-center justify-center">
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#219EBC] border-t-transparent"
                aria-hidden="true"
              />
            </div>
          ) : (
            <>
              <ul className="space-y-2 mb-3" aria-label="Participants">
                {participants.map((p) => (
                  <li key={p.uid} className="flex items-center gap-3">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: avatarColor(p.uid) }}
                      aria-hidden="true"
                    >
                      {p.displayName.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-[#023047] truncate">
                      {p.displayName}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-[#023047]/50 text-center" aria-live="polite">
                {participantCount} {participantCount === 1 ? "participant" : "participants"} joined
              </p>
            </>
          )}
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
            <div className="relative inline-block group">
              <button
                onClick={() => {
                  // TODO: restore participantCount < 2 check after testing
                  // if (participantCount < 2) return;
                  setStartError(null);
                  setShowCountdown(true);
                }}
                disabled={isPending /* || participantCount < 2 */}
                aria-busy={isPending}
                aria-describedby={participantCount < 2 ? "start-tooltip" : undefined}
                className={[
                  "rounded-xl px-8 py-3 text-sm font-semibold transition-colors min-h-[44px]",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB703]",
                  isPending || participantCount < 2
                    ? "cursor-not-allowed bg-[#8ECAE6]/40 text-[#023047]/40"
                    : "bg-[#FFB703] text-[#023047] hover:bg-[#FB8500] active:bg-[#FB8500]",
                ].join(" ")}
              >
                {isPending ? "Starting…" : "Start Voting"}
              </button>
              {participantCount < 2 && (
                <span
                  id="start-tooltip"
                  role="tooltip"
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block group-focus-within:block whitespace-nowrap rounded bg-[#023047] px-3 py-1.5 text-xs text-white shadow-lg"
                >
                  Need at least 2 participants to start
                </span>
              )}
            </div>
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

        {/* Cancel Session button — only visible to host */}
        {isHost && (
          <div className="mt-4">
            <button
              onClick={handleCancel}
              disabled={cancelPending || showCountdown}
              className={[
                "rounded-xl px-6 py-2 text-sm font-medium transition-colors min-h-[44px]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400",
                cancelPending || showCountdown
                  ? "cursor-not-allowed text-red-300"
                  : "text-red-600 hover:bg-red-50 active:bg-red-100",
              ].join(" ")}
            >
              {cancelPending ? "Cancelling…" : "Cancel Session"}
            </button>
            {cancelError && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {cancelError}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
