"use client";

import React, { useState, useCallback } from "react";
import { doc, setDoc, updateDoc, deleteField } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { useAuth } from "@/app/context/AuthContext";
import { trackEvent, reportError } from "@/app/lib/analytics";
import RestaurantCard from "./RestaurantCard";
import UndoButton from "./UndoButton";
import WaitingScreen from "./WaitingScreen";
import type { Restaurant } from "@/types";

interface SwipeDeckProps {
  sessionId: string;
  restaurants: Restaurant[];
  userLocation?: { lat: number; lng: number } | null;
}

/**
 * SwipeDeck — manages the stack of RestaurantCards and vote recording.
 *
 * Features:
 * - Renders stacked deck: active card in foreground, up to 2 peek cards behind
 * - Manages currentIndex state
 * - Writes vote to sessions/{sessionId}/votes/{uid} via Firestore client SDK
 * - Shows error notification and blocks deck advance if write fails
 * - Displays "X of Y remaining" progress counter
 * - Transitions to WaitingScreen after the last card is swiped
 */
export default function SwipeDeck({ sessionId, restaurants, userLocation }: SwipeDeckProps) {
  const { uid } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [votedCards, setVotedCards] = useState<Set<string>>(new Set());
  const [lastSwipedRestaurantId, setLastSwipedRestaurantId] = useState<string | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);

  const remaining = restaurants.length - currentIndex;
  const isComplete = currentIndex >= restaurants.length;

  const handleSwipe = useCallback(
    async (direction: "accept" | "reject") => {
      if (!uid || isAnimating) return;

      const restaurant = restaurants[currentIndex];
      if (!restaurant) return;

      // Prevent duplicate votes
      if (votedCards.has(restaurant.id)) return;

      setIsAnimating(true);
      setWriteError(null);

      try {
        // Write vote to Firestore
        const voteRef = doc(db, "sessions", sessionId, "votes", uid);
        await setDoc(
          voteRef,
          { [restaurant.id]: direction },
          { merge: true }
        );

        // Track swipe event
        trackEvent(direction === "accept" ? "swipe_accept" : "swipe_reject", {
          sessionId,
          restaurantId: restaurant.id,
        });

        // Mark card as voted and advance
        setVotedCards((prev) => new Set(prev).add(restaurant.id));
        setLastSwipedRestaurantId(restaurant.id);
        setCurrentIndex((prev) => prev + 1);
      } catch (err) {
        const error = err instanceof Error
          ? err
          : new Error("Failed to record vote. Please try again.");
        reportError(error, { component: "SwipeDeck", sessionId, restaurantId: restaurants[currentIndex]?.id });
        setWriteError(error.message);
      } finally {
        setIsAnimating(false);
      }
    },
    [uid, sessionId, restaurants, currentIndex, isAnimating, votedCards]
  );

  const handleRetry = useCallback(() => {
    setWriteError(null);
  }, []);

  const handleUndo = useCallback(async () => {
    if (!uid || !lastSwipedRestaurantId || isUndoing || isAnimating) return;

    setIsUndoing(true);
    setWriteError(null);

    try {
      // Remove the vote field from Firestore
      const voteRef = doc(db, "sessions", sessionId, "votes", uid);
      await updateDoc(voteRef, { [lastSwipedRestaurantId]: deleteField() });

      // Rewind local state
      setVotedCards((prev) => {
        const next = new Set(prev);
        next.delete(lastSwipedRestaurantId);
        return next;
      });
      setCurrentIndex((prev) => prev - 1);

      // Single-level undo: clear the last swiped ID
      setLastSwipedRestaurantId(null);

      trackEvent("swipe_undo", {
        sessionId,
        restaurantId: lastSwipedRestaurantId,
      });
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error("Failed to undo swipe. Please try again.");
      reportError(error, {
        component: "SwipeDeck",
        sessionId,
        restaurantId: lastSwipedRestaurantId,
      });
      setWriteError(error.message);
    } finally {
      setIsUndoing(false);
    }
  }, [uid, sessionId, lastSwipedRestaurantId, isUndoing, isAnimating]);

  // Show WaitingScreen after all cards are swiped
  if (isComplete) {
    return <WaitingScreen sessionId={sessionId} restaurants={restaurants} />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8" style={{ background: "linear-gradient(180deg, #8ECAE6 0%, #219EBC 100%)" }}>
      <div className="w-full max-w-sm">
        {/* Progress counter */}
        <div className="mb-4 text-center">
          <p className="text-sm font-medium text-[#023047]/70" data-testid="progress-counter">
            {remaining} of {restaurants.length} remaining
          </p>
        </div>

        {/* Card stack */}
        <div className="relative h-[360px] sm:h-[400px] w-full" style={{ touchAction: "none" }}>
          {restaurants.map((restaurant, index) => {
            // Only render current card and up to 2 peek cards behind
            if (index < currentIndex || index > currentIndex + 2) return null;

            const offset = index - currentIndex;
            const scale = 1 - offset * 0.05;
            const translateY = offset * 8;

            return (
              <div
                key={restaurant.id}
                className="absolute inset-0"
                style={{
                  zIndex: restaurants.length - index,
                  transform: `scale(${scale}) translateY(${translateY}px)`,
                  opacity: offset === 0 ? 1 : 0.7,
                }}
              >
                <RestaurantCard
                  restaurant={restaurant}
                  onSwipe={handleSwipe}
                  disabled={votedCards.has(restaurant.id) || isAnimating}
                  isActive={index === currentIndex}
                  userLocation={userLocation}
                />
              </div>
            );
          })}
        </div>

        {/* Undo button */}
        <div className="flex justify-center">
          <UndoButton
            canUndo={currentIndex > 0 && lastSwipedRestaurantId !== null}
            isLoading={isUndoing || isAnimating}
            onUndo={handleUndo}
          />
        </div>

        {/* Error notification */}
        {writeError && (
          <div
            className="mt-4 rounded-2xl border border-red-200 bg-white/90 backdrop-blur-sm p-3 text-center shadow-lg"
            role="alert"
          >
            <p className="text-sm text-red-700">{writeError}</p>
            <button
              onClick={handleRetry}
              className="mt-2 text-sm font-medium text-red-600 underline hover:text-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
