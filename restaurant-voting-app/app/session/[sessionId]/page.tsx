"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { useAuth } from "@/app/context/AuthContext";
import { checkForMatch } from "@/app/lib/match";
import LobbyScreen from "@/app/components/LobbyScreen";
import SwipeDeck from "@/app/components/SwipeDeck";
import WaitingScreen from "@/app/components/WaitingScreen";
import ErrorScreen from "@/app/components/ErrorScreen";
import MatchScreen from "@/app/components/MatchScreen";
import NoMatchScreen from "@/app/components/NoMatchScreen";
import type { Session, SessionState } from "@/types";

const MAX_PARTICIPANTS = 10;

/**
 * SessionPage — the dynamic route for /session/[sessionId].
 */
export default function SessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { uid } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sessionFull, setSessionFull] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const hasRegistered = useRef(false);

  // Register participant (idempotent)
  const registerParticipant = useCallback(async () => {
    if (!uid || !sessionId || hasRegistered.current) return;

    try {
      const participantsRef = collection(
        db, "sessions", sessionId, "participants"
      );
      const snapshot = await getDocs(participantsRef);

      const existingDoc = snapshot.docs.find((d) => d.id === uid);
      if (existingDoc) {
        hasRegistered.current = true;
        return;
      }

      if (snapshot.size >= MAX_PARTICIPANTS) {
        setSessionFull(true);
        return;
      }

      await setDoc(doc(db, "sessions", sessionId, "participants", uid), {
        uid,
        joinedAt: serverTimestamp(),
        active: true,
        completedAt: null,
      });

      hasRegistered.current = true;
    } catch (err) {
      setJoinError(
        err instanceof Error ? err.message : "Failed to join session"
      );
    }
  }, [uid, sessionId]);

  // Subscribe to session document
  useEffect(() => {
    if (!sessionId) return;

    const sessionRef = doc(db, "sessions", sessionId);
    const unsubscribe = onSnapshot(
      sessionRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data = snapshot.data() as Session;
        setSession(data);
        setLoading(false);
      },
      (err) => {
        console.error("Session snapshot error:", err);
        setNotFound(true);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [sessionId]);

  // Register participant once session is loaded
  useEffect(() => {
    if (!loading && session && uid && !notFound && !sessionFull) {
      registerParticipant();
    }
  }, [loading, session, uid, notFound, sessionFull, registerParticipant]);

  // Task 9.1–9.3: Real-time vote tracking and match detection
  useEffect(() => {
    if (!sessionId || !session) return;
    // Only listen for votes when session is active
    if (session.state !== "active") return;

    const votesRef = collection(db, "sessions", sessionId, "votes");
    const participantsRef = collection(db, "sessions", sessionId, "participants");

    const unsubscribe = onSnapshot(votesRef, async (votesSnapshot) => {
      // Build votes map: { uid: { restaurantId: "accept"|"reject" } }
      const votes: Record<string, Record<string, "accept" | "reject">> = {};
      votesSnapshot.docs.forEach((voteDoc) => {
        const data = voteDoc.data();
        votes[voteDoc.id] = data as Record<string, "accept" | "reject">;
      });

      // Get active participants
      const participantsSnapshot = await getDocs(participantsRef);
      const activeParticipants = participantsSnapshot.docs
        .filter((d) => d.data().active !== false)
        .map((d) => d.id);

      if (activeParticipants.length === 0) return;

      // Check for match
      const matchedId = checkForMatch(
        session.restaurants,
        votes,
        activeParticipants
      );

      if (matchedId) {
        // Write match state to session
        try {
          await updateDoc(doc(db, "sessions", sessionId), {
            state: "match",
            matchedRestaurantId: matchedId,
          });
        } catch {
          // Last-write-wins is safe; ignore errors
        }
        return;
      }

      // Check for no-match: all active participants have voted on all restaurants
      const allDone = activeParticipants.every((participantUid) => {
        const participantVotes = votes[participantUid];
        if (!participantVotes) return false;
        return session.restaurants.every(
          (r) => participantVotes[r.id] !== undefined
        );
      });

      if (allDone) {
        try {
          await updateDoc(doc(db, "sessions", sessionId), {
            state: "no_match",
          });
        } catch {
          // Best-effort
        }
      }
    });

    return () => unsubscribe();
  }, [sessionId, session?.state, session?.restaurants]);

  // Disconnection handler
  useEffect(() => {
    if (!uid || !sessionId) return;

    let disconnectTimeout: NodeJS.Timeout | null = null;

    const handleOffline = () => {
      disconnectTimeout = setTimeout(async () => {
        try {
          await setDoc(
            doc(db, "sessions", sessionId, "participants", uid),
            { active: false },
            { merge: true }
          );
        } catch {
          // Best-effort
        }
      }, 30000);
    };

    const handleOnline = () => {
      if (disconnectTimeout) {
        clearTimeout(disconnectTimeout);
        disconnectTimeout = null;
      }
      setDoc(
        doc(db, "sessions", sessionId, "participants", uid),
        { active: true },
        { merge: true }
      ).catch(() => {});
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (disconnectTimeout) clearTimeout(disconnectTimeout);
    };
  }, [uid, sessionId]);

  // --- Render states ---

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-zinc-500 text-sm">Loading session…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4" role="alert">
        <h1 className="text-xl font-semibold text-zinc-900">Session not found</h1>
        <p className="text-zinc-600 text-center max-w-sm">
          This session doesn&apos;t exist or may have been deleted.
        </p>
      </div>
    );
  }

  if (sessionFull) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4" role="alert">
        <h1 className="text-xl font-semibold text-zinc-900">Session is full</h1>
        <p className="text-zinc-600 text-center max-w-sm">
          This session already has {MAX_PARTICIPANTS} participants and cannot accept more.
        </p>
      </div>
    );
  }

  if (joinError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4" role="alert">
        <h1 className="text-xl font-semibold text-zinc-900">Failed to join session</h1>
        <p className="text-sm text-red-600">{joinError}</p>
      </div>
    );
  }

  if (!session) return null;

  const state: SessionState = session.state;

  switch (state) {
    case "lobby":
      return <LobbyScreen sessionId={sessionId} session={session} />;
    case "active":
      return <SwipeDeck sessionId={sessionId} restaurants={session.restaurants} />;
    case "waiting":
      return <WaitingScreen />;
    case "match": {
      const matchedRestaurant = session.restaurants.find(
        (r) => r.id === session.matchedRestaurantId
      );
      if (!matchedRestaurant) {
        return (
          <div className="flex min-h-screen items-center justify-center bg-zinc-50">
            <p className="text-zinc-500 text-sm">Loading match…</p>
          </div>
        );
      }
      return (
        <MatchScreen
          restaurant={matchedRestaurant}
          hostUid={session.hostUid}
        />
      );
    }
    case "no_match":
      return <NoMatchScreen />;
    case "error":
      return <ErrorScreen sessionId={sessionId} session={session} />;
    default:
      return null;
  }
}
