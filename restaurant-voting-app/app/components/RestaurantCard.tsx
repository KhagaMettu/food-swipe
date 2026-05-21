"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { computeSwipeDirection } from "@/app/lib/swipe";
import type { Restaurant } from "@/types";

interface RestaurantCardProps {
  restaurant: Restaurant;
  onSwipe: (direction: "accept" | "reject") => void;
  disabled?: boolean;
  isActive?: boolean;
}

/**
 * RestaurantCard — a swipeable card displaying restaurant info.
 *
 * Features:
 * - Framer Motion drag="x" with threshold-based swipe detection
 * - ✗ / ✓ buttons as accessibility alternatives to drag
 * - Left/right arrow key support
 * - Visible focus indicator
 * - Displays displayName, rating (1 decimal), photo (with placeholder fallback)
 * - Alt text contains displayName
 * - Disables interaction once a vote is recorded
 */
export default function RestaurantCard({
  restaurant,
  onSwipe,
  disabled = false,
  isActive = true,
}: RestaurantCardProps) {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);

  // Delay enabling drag until after mount to avoid projection issues
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (disabled || !isActive) return;

      const cardWidth = cardRef.current?.offsetWidth || 300;
      const direction = computeSwipeDirection(info.offset.x, cardWidth);

      if (direction) {
        onSwipe(direction);
      }
    },
    [disabled, isActive, onSwipe]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled || !isActive) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        onSwipe("accept");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onSwipe("reject");
      }
    },
    [disabled, isActive, onSwipe]
  );

  const handleReject = useCallback(() => {
    if (!disabled && isActive) onSwipe("reject");
  }, [disabled, isActive, onSwipe]);

  const handleAccept = useCallback(() => {
    if (!disabled && isActive) onSwipe("accept");
  }, [disabled, isActive, onSwipe]);

  const photoUrl = restaurant.photoReference || null;

  const canDrag = mounted && isActive && !disabled;

  return (
    <div ref={constraintsRef} className="absolute inset-0">
      <motion.div
        ref={cardRef}
        className={[
          "absolute inset-0 flex flex-col rounded-2xl border border-[#8ECAE6]/30 bg-white shadow-xl overflow-hidden",
          "focus-visible:ring-4 focus-visible:ring-[#219EBC] focus-visible:ring-offset-2 focus-visible:outline-none",
          disabled ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
        style={{ x, rotate }}
        drag={canDrag ? "x" : false}
        dragConstraints={constraintsRef}
        dragElastic={0.7}
        dragSnapToOrigin
        onDragEnd={handleDragEnd}
        tabIndex={isActive && !disabled ? 0 : -1}
        onKeyDown={handleKeyDown}
        role="article"
        aria-label={`Restaurant card: ${restaurant.displayName}`}
        data-testid="restaurant-card"
      >
        {/* Photo */}
        <div className="relative h-48 w-full bg-[#8ECAE6]/20 flex-shrink-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={`Photo of ${restaurant.displayName}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="h-full w-full flex items-center justify-center bg-[#8ECAE6]/30"
              role="img"
              aria-label={`Placeholder image for ${restaurant.displayName}`}
              data-testid="photo-placeholder"
            >
              <span className="text-4xl">🍽️</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col flex-1 p-4">
          <h2 className="text-lg font-semibold text-[#023047] truncate">
            {restaurant.displayName}
          </h2>
          <p className="text-sm text-[#023047]/60 mt-1">
            ⭐ {restaurant.rating.toFixed(1)} / 5.0
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-6 p-4 border-t border-[#8ECAE6]/20">
          <button
            onClick={handleReject}
            disabled={disabled || !isActive}
            aria-label="Reject restaurant"
            className={[
              "flex h-12 w-12 items-center justify-center rounded-full border-2 text-xl transition-colors",
              "focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:outline-none",
              disabled || !isActive
                ? "border-[#8ECAE6]/30 text-[#8ECAE6]/50 cursor-not-allowed"
                : "border-red-300 text-red-500 hover:bg-red-50 active:bg-red-100",
            ].join(" ")}
            data-testid="reject-button"
          >
            ✗
          </button>

          <button
            onClick={handleAccept}
            disabled={disabled || !isActive}
            aria-label="Accept restaurant"
            className={[
              "flex h-12 w-12 items-center justify-center rounded-full border-2 text-xl transition-colors",
              "focus-visible:ring-2 focus-visible:ring-[#FFB703] focus-visible:ring-offset-2 focus-visible:outline-none",
              disabled || !isActive
                ? "border-[#8ECAE6]/30 text-[#8ECAE6]/50 cursor-not-allowed"
                : "border-[#FFB703] text-[#FFB703] hover:bg-[#FFB703]/10 active:bg-[#FFB703]/20",
            ].join(" ")}
            data-testid="accept-button"
          >
            ✓
          </button>
        </div>
      </motion.div>
    </div>
  );
}
