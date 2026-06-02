"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import type { Restaurant } from "@/types";

interface ParticipantProgress {
  uid: string;
  displayName: string;
  active: boolean;
  votedCount: number;
}

interface WaitingScreenProps {
  sessionId: string;
  restaurants: Restaurant[];
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

/**
 * WaitingScreen — displayed after a participant has swiped all cards.
 * Shows real-time progress of other participants with avatars and progress bars.
 */
export default function WaitingScreen({ sessionId, restaurants }: WaitingScreenProps) {
  const [participants, setParticipants] = useState<ParticipantProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const totalCards = restaurants.length;

  // Subscribe to participants and votes subcollections for live progress
  useEffect(() => {
    const participantsRef = collection(db, "sessions", sessionId, "participants");
    const votesRef = collection(db, "sessions", sessionId, "votes");

    let participantData: Map<string, { displayName: string; active: boolean }> = new Map();
    let voteData: Map<string, number> = new Map();

    function computeProgress() {
      const progress: ParticipantProgress[] = [];
      for (const [uid, info] of participantData) {
        progress.push({
          uid,
          displayName: info.displayName,
          active: info.active,
          votedCount: voteData.get(uid) || 0,
        });
      }
      setParticipants(progress);
      setLoading(false);
    }

    const unsubParticipants = onSnapshot(participantsRef, (snapshot) => {
      participantData = new Map();
      for (const doc of snapshot.docs) {
        const data = doc.data();
        participantData.set(doc.id, {
          displayName: data.displayName || `Anonymous${doc.id.slice(-4)}`,
          active: data.active !== false,
        });
      }
      computeProgress();
    });

    const unsubVotes = onSnapshot(votesRef, (snapshot) => {
      voteData = new Map();
      for (const doc of snapshot.docs) {
        const data = doc.data();
        // Each vote document has restaurant IDs as keys
        const count = Object.keys(data).length;
        voteData.set(doc.id, count);
      }
      computeProgress();
    });

    return () => {
      unsubParticipants();
      unsubVotes();
    };
  }, [sessionId]);

  // Calculate how many participants haven't finished
  const unfinishedCount = participants.filter(
    (p) => p.active && p.votedCount < totalCards
  ).length;

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ background: "linear-gradient(180deg, #8ECAE6 0%, #219EBC 100%)" }}
    >
      <div className="rounded-2xl bg-white/90 backdrop-blur-sm shadow-xl p-8 text-center max-w-sm w-full">
        <div className="mb-4">
          <span
            className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#8ECAE6] border-t-[#023047]"
            aria-hidden="true"
          />
        </div>
        <h1 className="text-xl font-semibold text-[#023047] mb-4">
          Waiting for others…
        </h1>

        {loading ? (
          <p className="text-sm text-[#023047]/70">Loading progress…</p>
        ) : (
          <>
            {/* Participant progress list */}
            <ul className="space-y-3 text-left mb-4" aria-label="Participant progress">
              {participants.map((p) => {
                const fraction = `${p.votedCount}/${totalCards}`;
                const percentage = totalCards > 0 ? (p.votedCount / totalCards) * 100 : 0;
                const isFinished = p.votedCount >= totalCards;

                return (
                  <li key={p.uid} className="flex items-center gap-3">
                    {/* Avatar */}
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shrink-0 ${
                        !p.active ? "opacity-50" : ""
                      }`}
                      style={{ backgroundColor: avatarColor(p.uid) }}
                      aria-hidden="true"
                    >
                      {p.displayName.charAt(0).toUpperCase()}
                    </span>

                    {/* Name + progress */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-sm font-medium truncate ${
                            !p.active ? "text-[#023047]/40" : "text-[#023047]"
                          }`}
                        >
                          {p.displayName}
                          {!p.active && (
                            <span className="ml-1 text-xs text-[#023047]/40">(Disconnected)</span>
                          )}
                        </span>
                        <span className="text-xs text-[#023047]/60 shrink-0">
                          {fraction}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div
                        className="mt-1 h-2 w-full rounded-full bg-[#8ECAE6]/30 overflow-hidden"
                        role="progressbar"
                        aria-valuenow={p.votedCount}
                        aria-valuemin={0}
                        aria-valuemax={totalCards}
                        aria-label={`${p.displayName} progress`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isFinished ? "bg-[#2A9D8F]" : "bg-[#219EBC]"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* "Almost there" message */}
            {unfinishedCount === 1 && (
              <p className="text-sm font-medium text-[#FB8500]" aria-live="polite">
                Almost there…
              </p>
            )}

            {unfinishedCount === 0 && (
              <p className="text-sm text-[#023047]/70">
                Everyone&apos;s done! Calculating results…
              </p>
            )}

            {unfinishedCount > 1 && (
              <p className="mt-2 text-sm text-[#023047]/70 max-w-xs mx-auto">
                You&apos;ve finished voting. We&apos;ll show the result as soon as
                everyone is done.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
