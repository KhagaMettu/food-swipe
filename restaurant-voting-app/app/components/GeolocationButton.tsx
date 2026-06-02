"use client";

import React, { useState } from "react";
import { getCurrentLocation } from "@/app/lib/geolocation";

export type LocationData = {
  lat: number;
  lng: number;
  locationName: string;
};

interface GeolocationButtonProps {
  /** Called when location is successfully obtained or cleared */
  onLocationChange: (location: LocationData | null) => void;
  /** Called to reverse-geocode coordinates to a human-readable name */
  reverseGeocode: (lat: number, lng: number) => Promise<string>;
}

/**
 * "Use my location" button with loading state, success indicator, and error handling.
 *
 * - On success: displays "📍 {locationName} detected" with a clear button
 * - On denial: shows a dismissible "Location access denied" message
 * - On timeout: silently resolves with no UI change
 */
export default function GeolocationButton({
  onLocationChange,
  reverseGeocode,
}: GeolocationButtonProps) {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    const result = await getCurrentLocation();

    if (result.success) {
      let locationName = `${result.lat.toFixed(2)}, ${result.lng.toFixed(2)}`;
      try {
        locationName = await reverseGeocode(result.lat, result.lng);
      } catch {
        // Fall back to coordinates if reverse geocoding fails
      }

      const data: LocationData = {
        lat: result.lat,
        lng: result.lng,
        locationName,
      };
      setLocation(data);
      onLocationChange(data);
    } else if (result.reason === "denied") {
      setError("Location access denied. You can type your location manually.");
    }
    // On timeout or unavailable: silently resolve, no UI change

    setLoading(false);
  }

  function handleClear() {
    setLocation(null);
    onLocationChange(null);
  }

  function handleDismissError() {
    setError(null);
  }

  // Show location indicator if we have a detected location
  if (location) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#023047]">
        <span aria-label={`Location detected: ${location.locationName}`}>
          📍 {location.locationName} detected
        </span>
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear detected location"
          className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[#023047]/60 hover:text-[#023047] hover:bg-[#8ECAE6]/30 transition-colors"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-busy={loading}
        className={[
          "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors min-h-[44px]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#219EBC]",
          loading
            ? "cursor-not-allowed text-[#023047]/40"
            : "text-[#219EBC] hover:bg-[#8ECAE6]/20 active:bg-[#8ECAE6]/30",
        ].join(" ")}
      >
        {loading ? (
          <>
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#219EBC] border-t-transparent"
              aria-hidden="true"
            />
            Detecting location…
          </>
        ) : (
          <>
            <span aria-hidden="true">📍</span>
            Use my location
          </>
        )}
      </button>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 text-sm text-[#FB8500]"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={handleDismissError}
            aria-label="Dismiss location error"
            className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[#FB8500]/60 hover:text-[#FB8500] transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
