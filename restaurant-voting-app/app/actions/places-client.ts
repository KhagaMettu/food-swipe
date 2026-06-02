"use server";

import type { TagSet, Restaurant } from "@/types";
import { PlacesAPIError } from "@/app/lib/errors";
import type { SearchFiltersState } from "@/app/components/SearchFilters";

/**
 * Haversine formula: straight-line distance between two coordinates in km.
 */
function haversineKm(
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
 * Fetches restaurant data from the Google Places API (New).
 *
 * @param tagSet - The structured search parameters
 * @param locationBias - Optional coordinates for location-biased search
 * @param filters - Optional search filters (price, dietary, radius, show closed)
 * @returns Array of up to 5 restaurants
 * @throws PlacesAPIError on API errors
 */
export async function fetchRestaurants(
  tagSet: TagSet,
  locationBias?: { lat: number; lng: number },
  filters?: SearchFiltersState
): Promise<Restaurant[]> {
  if (typeof window !== "undefined") {
    throw new PlacesAPIError(
      "fetchRestaurants must only be called from a Server Action context"
    );
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    throw new PlacesAPIError(
      "GOOGLE_PLACES_API_KEY is not configured on the server"
    );
  }

  // Construct the search query
  const locationPart = tagSet.location ? ` in ${tagSet.location}` : "";
  const dietaryPart =
    filters?.dietary && filters.dietary.length > 0
      ? ` ${filters.dietary.join(" ")}`
      : "";
  const textQuery = `${tagSet.cuisine}${dietaryPart} restaurant${locationPart}`;

  const requestBody: Record<string, unknown> = {
    textQuery,
    maxResultCount: 10,
  };

  // Map price filter to Places API priceLevels
  if (filters?.priceLevels && filters.priceLevels.length > 0) {
    const priceLevelMap = new Map([
      ["$", "PRICE_LEVEL_INEXPENSIVE"],
      ["$$", "PRICE_LEVEL_MODERATE"],
      ["$$$", "PRICE_LEVEL_EXPENSIVE"],
      ["$$$$", "PRICE_LEVEL_VERY_EXPENSIVE"],
    ]);
    requestBody.priceLevels = filters.priceLevels.map(
      (p) => priceLevelMap.get(p) ?? "PRICE_LEVEL_MODERATE"
    );
  }

  // Add location bias with configurable radius
  if (locationBias) {
    const radiusMeters = (filters?.radiusKm ?? 5) * 1000;
    requestBody.locationBias = {
      circle: {
        center: {
          latitude: locationBias.lat,
          longitude: locationBias.lng,
        },
        radius: radiusMeters,
      },
    };
  }

  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.rating,places.photos,places.formattedAddress,places.priceLevel,places.websiteUri,places.googleMapsUri,places.currentOpeningHours,places.location",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new PlacesAPIError(
        `Google Places API error: ${response.statusText}`,
        response.status,
        errorText
      );
    }

    const data = await response.json();

    // Map response and optionally filter out closed restaurants
    const places = data.places || [];
    const showClosed = filters?.showClosed ?? false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped: Restaurant[] = places
      .filter(
        (place: any) =>
          showClosed || place.currentOpeningHours?.openNow !== false
      )
      .map((place: any) => ({
        id: place.id || "",
        displayName: place.displayName?.text || "Unknown Restaurant",
        rating: place.rating || 0,
        photoReference: place.photos?.[0]?.name
          ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxWidthPx=400&key=${apiKey}`
          : null,
        photos: (place.photos || [])
          .slice(0, 5)
          .map(
            (photo: any) =>
              `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=400&key=${apiKey}`
          ),
        address: place.formattedAddress || null,
        priceLevel: place.priceLevel || null,
        websiteUri: place.websiteUri || null,
        googleMapsUri: place.googleMapsUri || null,
        openNow: place.currentOpeningHours?.openNow ?? null,
        weekdayHours: place.currentOpeningHours?.weekdayDescriptions || null,
        location: place.location
          ? { lat: place.location.latitude, lng: place.location.longitude }
          : null,
      }));

    // Hard-filter by radius: remove restaurants beyond the user's chosen distance
    if (locationBias && filters?.radiusKm) {
      const maxKm = filters.radiusKm;
      return mapped.filter((r) => {
        if (!r.location) return true; // keep if no coords (can't calculate)
        const km = haversineKm(
          locationBias.lat,
          locationBias.lng,
          r.location.lat,
          r.location.lng
        );
        return km <= maxKm;
      });
    }

    return mapped;
  } catch (err) {
    if (err instanceof PlacesAPIError) {
      throw err;
    }
    if (err instanceof Error) {
      throw new PlacesAPIError(
        `Failed to fetch restaurants: ${err.message}`,
        undefined,
        err
      );
    }
    throw new PlacesAPIError(
      "Failed to fetch restaurants: Unknown error",
      undefined,
      err
    );
  }
}
