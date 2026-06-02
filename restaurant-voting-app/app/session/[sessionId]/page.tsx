"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
import { trackEvent } from "@/app/lib/analytics";
import { getCurrentLocation } from "@/app/lib/geolocation";
import ErrorBoundary from "@/app/components/ErrorBoundary";
import LobbyScreen from "@/app/components/LobbyScreen";
import SwipeDeck from "@/app/components/SwipeDeck";
import WaitingScreen from "@/app/components/WaitingScreen";
import ErrorScreen from "@/app/components/ErrorScreen";
import MatchScreen from "@/app/components/MatchScreen";
import NoMatchScreen from "@/app/components/NoMatchScreen";
import NameModal from "@/app/components/NameModal";
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
  const [showNameModal, setShowNameModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

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
        // Check if participant already has a displayName
        const data = existingDoc.data();
        if (!data.displayName) {
          setShowNameModal(true);
        }
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

      trackEvent("session_joined", { sessionId, uid });
      hasRegistered.current = true;
      // Show name modal for new participants
      setShowNameModal(true);
    } catch (err) {
      setJoinError(
        err instanceof Error ? err.message : "Failed to join session"
      );
    }
  }, [uid, sessionId]);

  // Handle display name submission from NameModal
  const handleNameSubmit = useCallback(async (displayName: string) => {
    if (!uid || !sessionId) return;
    try {
      await updateDoc(doc(db, "sessions", sessionId, "participants", uid), {
        displayName,
      });
    } catch {
      // Best-effort: if update fails, participant still joins without a custom name
    }
    setShowNameModal(false);
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      registerParticipant();
    }
  }, [loading, session, uid, notFound, sessionFull, registerParticipant]);

  // Get user location for distance display on cards
  useEffect(() => {
    getCurrentLocation().then((result) => {
      if (result.success) {
        setUserLocation({ lat: result.lat, lng: result.lng });
      }
    });
  }, []);

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
          trackEvent("match_found", { sessionId, restaurantId: matchedId });
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
          trackEvent("no_match", { sessionId });
        } catch {
          // Best-effort
        }
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Show name modal overlay if needed
  const nameModal = showNameModal && uid ? (
    <NameModal
      uid={uid}
      onSubmit={handleNameSubmit}
      onSkip={() => {}}
    />
  ) : null;

  switch (state) {
    case "lobby":
      return (
        <ErrorBoundary sessionId={sessionId} componentName="SessionPage">
          {nameModal}
          <LobbyScreen sessionId={sessionId} session={session} />
        </ErrorBoundary>
      );
    case "active":
      return (
        <ErrorBoundary sessionId={sessionId} componentName="SessionPage">
          {nameModal}
          <ErrorBoundary sessionId={sessionId} componentName="SwipeDeck">
            <SwipeDeck sessionId={sessionId} restaurants={session.restaurants} userLocation={userLocation} />
          </ErrorBoundary>
        </ErrorBoundary>
      );
    case "waiting":
      return (
        <ErrorBoundary sessionId={sessionId} componentName="SessionPage">
          <WaitingScreen sessionId={sessionId} restaurants={session.restaurants} />
        </ErrorBoundary>
      );
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
        <ErrorBoundary sessionId={sessionId} componentName="SessionPage">
          <ErrorBoundary sessionId={sessionId} componentName="MatchScreen">
            <MatchScreen
              restaurant={matchedRestaurant}
              hostUid={session.hostUid}
            />
          </ErrorBoundary>
        </ErrorBoundary>
      );
    }
    case "no_match":
      return (
        <ErrorBoundary sessionId={sessionId} componentName="SessionPage">
          <NoMatchScreen />
        </ErrorBoundary>
      );
    case "error":
      return (
        <ErrorBoundary sessionId={sessionId} componentName="SessionPage">
          <ErrorScreen sessionId={sessionId} session={session} />
        </ErrorBoundary>
      );
    case "cancelled":
      return (
        <ErrorBoundary sessionId={sessionId} componentName="SessionPage">
          <div
            className="flex min-h-screen flex-col items-center justify-center gap-4 px-4"
            style={{ background: "linear-gradient(180deg, #8ECAE6 0%, #219EBC 100%)" }}
          >
            <h1 className="text-2xl font-bold text-[#023047]">Session Cancelled</h1>
            <p className="text-sm text-[#023047]/70 text-center max-w-sm">
              The host has cancelled this session.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#FFB703] px-6 py-3 text-sm font-semibold text-[#023047] hover:bg-[#FB8500] transition-colors min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB703]"
            >
              Go Home
            </Link>
          </div>
        </ErrorBoundary>
      );
    default:
      return null;
  }
}
