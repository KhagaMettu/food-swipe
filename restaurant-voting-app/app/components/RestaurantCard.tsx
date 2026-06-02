"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { computeSwipeDirection } from "@/app/lib/swipe";
import type { Restaurant } from "@/types";

interface RestaurantCardProps {
  restaurant: Restaurant;
  onSwipe: (direction: "accept" | "reject") => void;
  disabled?: boolean;
  isActive?: boolean;
  userLocation?: { lat: number; lng: number } | null;
}

/**
 * Calculates straight-line distance between two coordinates using Haversine formula.
 * Returns distance in km.
 */
function getDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats distance for display.
 */
function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m away`;
  return `${km.toFixed(1)}km away`;
}

/**
 * Estimates walking time in minutes (assuming ~5km/h).
 */
function estimateWalkMin(km: number): number {
  return Math.round((km / 5) * 60);
}

/**
 * Maps Places API priceLevel to a dollar sign string.
 */
function formatPriceLevel(level: string | null): string | null {
  switch (level) {
    case "PRICE_LEVEL_FREE":
      return "Free";
    case "PRICE_LEVEL_INEXPENSIVE":
      return "$";
    case "PRICE_LEVEL_MODERATE":
      return "$$";
    case "PRICE_LEVEL_EXPENSIVE":
      return "$$$";
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return "$$$$";
    default:
      return null;
  }
}

/**
 * RestaurantCard — a swipeable card displaying restaurant info.
 *
 * Features:
 * - Restaurant photo with placeholder fallback
 * - Distance/walk time from user location (Haversine)
 * - Expandable details panel (hours, address, website link)
 * - Framer Motion drag with threshold-based swipe detection
 * - Keyboard and button accessibility alternatives
 */
export default function RestaurantCard({
  restaurant,
  onSwipe,
  disabled = false,
  isActive = true,
  userLocation,
}: RestaurantCardProps) {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (disabled || !isActive) return;
      const cardWidth = cardRef.current?.offsetWidth || 300;
      const direction = computeSwipeDirection(info.offset.x, cardWidth);
      if (direction) onSwipe(direction);
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
  const photos = restaurant.photos && restaurant.photos.length > 0 ? restaurant.photos : (photoUrl ? [photoUrl] : []);
  const canDrag = mounted && isActive && !disabled;
  const price = formatPriceLevel(restaurant.priceLevel);

  // Calculate distance if both locations are available
  let distanceText: string | null = null;
  let walkTime: number | null = null;
  if (userLocation && restaurant.location) {
    const km = getDistanceKm(
      userLocation.lat,
      userLocation.lng,
      restaurant.location.lat,
      restaurant.location.lng
    );
    distanceText = formatDistance(km);
    walkTime = estimateWalkMin(km);
  }

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
        {/* Photo carousel */}
        <div className="relative h-40 sm:h-48 w-full bg-[#8ECAE6]/20 flex-shrink-0">
          {photos.length > 0 ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[photoIndex]}
                alt={`Photo ${photoIndex + 1} of ${restaurant.displayName}`}
                className="h-full w-full object-cover cursor-zoom-in"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxOpen(true);
                }}
              />
              {/* Navigation dots + arrows */}
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhotoIndex((i) => (i - 1 + photos.length) % photos.length);
                    }}
                    aria-label="Previous photo"
                    className="absolute left-1 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white text-xs hover:bg-black/60 transition-colors"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhotoIndex((i) => (i + 1) % photos.length);
                    }}
                    aria-label="Next photo"
                    className="absolute right-1 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white text-xs hover:bg-black/60 transition-colors"
                  >
                    ›
                  </button>
                  {/* Dots */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {photos.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 w-1.5 rounded-full transition-colors ${
                          i === photoIndex ? "bg-white" : "bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
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
          {/* Open/Closed badge */}
          {restaurant.openNow !== null && (
            <span
              className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                restaurant.openNow
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {restaurant.openNow ? "Open" : "Closed"}
            </span>
          )}
        </div>

        {/* Info section */}
        <div className="flex flex-col flex-1 p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold text-[#023047] truncate">
            {restaurant.displayName}
          </h2>

          {/* Meta row: rating, price, distance */}
          <div className="flex items-center gap-2 mt-1 flex-wrap text-sm text-[#023047]/60">
            <span>⭐ {restaurant.rating.toFixed(1)}</span>
            {price && <span>· {price}</span>}
            {distanceText && (
              <span>
                · 📍 {distanceText}
                {walkTime !== null && walkTime <= 30 && ` (~${walkTime} min walk)`}
              </span>
            )}
          </div>

          {/* Address */}
          {restaurant.address && (
            <p className="text-xs text-[#023047]/50 mt-1 truncate">
              {restaurant.address}
            </p>
          )}

          {/* Expand/collapse details */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="mt-2 text-xs font-medium text-[#219EBC] hover:text-[#023047] transition-colors self-start"
            aria-expanded={expanded}
            aria-controls={`details-${restaurant.id}`}
          >
            {expanded ? "Hide details ▲" : "More details ▼"}
          </button>

          {/* Expandable details panel */}
          {expanded && (
            <div
              id={`details-${restaurant.id}`}
              className="mt-2 space-y-2 text-xs text-[#023047]/70 border-t border-[#8ECAE6]/20 pt-2"
            >
              {/* Hours */}
              {restaurant.weekdayHours && restaurant.weekdayHours.length > 0 && (
                <div>
                  <p className="font-medium text-[#023047]/80 mb-0.5">Hours</p>
                  <ul className="space-y-0.5">
                    {restaurant.weekdayHours.map((day, i) => (
                      <li key={i}>{day}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Links */}
              <div className="flex gap-3 pt-1">
                {restaurant.websiteUri && (
                  <a
                    href={restaurant.websiteUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[#219EBC] underline hover:text-[#023047]"
                  >
                    Website
                  </a>
                )}
                {restaurant.googleMapsUri && (
                  <a
                    href={restaurant.googleMapsUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[#219EBC] underline hover:text-[#023047]"
                  >
                    Directions
                  </a>
                )}
              </div>
            </div>
          )}
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

      {/* Lightbox overlay */}
      {lightboxOpen && photos.length > 0 && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close photo viewer"
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white text-lg hover:bg-white/30 transition-colors z-10"
          >
            ✕
          </button>

          {/* Full photo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[photoIndex]}
            alt={`Photo ${photoIndex + 1} of ${restaurant.displayName}`}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Navigation arrows */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPhotoIndex((i) => (i - 1 + photos.length) % photos.length);
                }}
                aria-label="Previous photo"
                className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white text-xl hover:bg-white/30 transition-colors"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPhotoIndex((i) => (i + 1) % photos.length);
                }}
                aria-label="Next photo"
                className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white text-xl hover:bg-white/30 transition-colors"
              >
                ›
              </button>
            </>
          )}

          {/* Photo counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
            {photoIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>
  );
}
