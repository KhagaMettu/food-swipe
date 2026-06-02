"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { buildGoogleMapsDeepLink, buildUberEatsDeepLink } from "@/app/lib/deep-links";
import { useAuth } from "@/app/context/AuthContext";
import type { Restaurant } from "@/types";

interface MatchScreenProps {
  restaurant: Restaurant;
  hostUid: string;
}

/**
 * MatchScreen — displayed when all active participants swipe right on the same restaurant.
 *
 * Features:
 * - Displays matched restaurant name, photo, and rating (one decimal place)
 * - "Open in Google Maps" button (disabled with tooltip if deep link unavailable)
 * - "Order on UberEats" button
 * - Framer Motion entrance animation (≤1 second)
 * - "Start New Session" button for Host / "Go to Home" for non-Host
 */
export default function MatchScreen({ restaurant, hostUid }: MatchScreenProps) {
  const router = useRouter();
  const { uid } = useAuth();

  const isHost = uid === hostUid;
  const googleMapsLink = buildGoogleMapsDeepLink(restaurant);
  const uberEatsLink = buildUberEatsDeepLink(restaurant);

  return (
    <motion.main
      className="flex min-h-screen flex-col items-center justify-center px-4 py-8"
      style={{ background: "linear-gradient(135deg, #FFB703 0%, #FB8500 50%, #219EBC 100%)" }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="w-full max-w-sm text-center">
        {/* Celebration header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mb-6"
        >
          <span className="text-5xl" aria-hidden="true">🎉</span>
          <h1 className="mt-2 text-2xl font-bold text-[#023047]">
            It&apos;s a match!
          </h1>
        </motion.div>

        {/* Restaurant card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="rounded-2xl bg-white shadow-xl overflow-hidden mb-6"
        >
          {/* Photo */}
          <div className="h-48 w-full bg-[#8ECAE6]/20">
            {restaurant.photoReference ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={restaurant.photoReference}
                alt={`Photo of ${restaurant.displayName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="h-full w-full flex items-center justify-center bg-[#8ECAE6]/30"
                role="img"
                aria-label={`Placeholder image for ${restaurant.displayName}`}
              >
                <span className="text-4xl">🍽️</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4">
            <h2 className="text-lg font-semibold text-[#023047]">
              {restaurant.displayName}
            </h2>
            <p className="text-sm text-[#023047]/60 mt-1">
              ⭐ {restaurant.rating.toFixed(1)} / 5.0
            </p>
            {restaurant.address && (
              <p className="text-xs text-[#023047]/50 mt-1">
                {restaurant.address}
              </p>
            )}
            {restaurant.websiteUri && (
              <a
                href={restaurant.websiteUri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-xs text-[#219EBC] underline hover:text-[#023047]"
              >
                Visit website
              </a>
            )}
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="flex flex-col gap-3"
        >
          {/* Google Maps + UberEats: stack vertically on mobile, side-by-side on md+ */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Google Maps button */}
            <div className="relative group flex-1">
              <a
                href={googleMapsLink || undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!googleMapsLink}
                className={[
                  "flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-colors w-full min-h-[44px]",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#219EBC]",
                  googleMapsLink
                    ? "bg-[#219EBC] text-white hover:bg-[#023047]"
                    : "bg-[#8ECAE6]/30 text-[#023047]/40 cursor-not-allowed pointer-events-none",
                ].join(" ")}
                data-testid="google-maps-button"
              >
                📍 Open in Google Maps
              </a>
              {!googleMapsLink && (
                <span
                  className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-[#023047] px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                  role="tooltip"
                >
                  Location data unavailable for this restaurant
                </span>
              )}
            </div>

            {/* UberEats button */}
            <a
              href={uberEatsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#FFB703] px-6 py-3 text-sm font-semibold text-[#023047] hover:bg-[#FB8500] transition-colors w-full min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB703]"
              data-testid="uber-eats-button"
            >
              🛵 Order on UberEats
            </a>
          </div>

          {/* Navigation button */}
          <button
            onClick={() => router.push("/")}
            className="mt-2 rounded-xl border border-[#023047]/20 bg-white/80 px-6 py-3 text-sm font-semibold text-[#023047] hover:bg-white transition-colors w-full min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#023047]"
            data-testid="home-button"
          >
            {isHost ? "Start New Session" : "Go to Home"}
          </button>
        </motion.div>
      </div>
    </motion.main>
  );
}
