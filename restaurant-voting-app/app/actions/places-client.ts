"use server";

import type { TagSet, Restaurant } from "@/types";
import { PlacesAPIError } from "@/app/lib/errors";

/**
 * Fetches restaurant data from the Google Places API (New).
 *
 * Requirements:
 * - POST /v1/places:searchText with X-Goog-FieldMask header
 * - Field mask: places.id,places.displayName,places.rating,places.photos
 * - maxResultCount: 5
 * - Maps response to Restaurant[]
 * - Throws PlacesAPIError on non-2xx responses
 * - Called exclusively from Server Actions (never exposed to client)
 *
 * @param tagSet - The structured search parameters
 * @returns Array of up to 5 restaurants
 * @throws PlacesAPIError on API errors
 */
export async function fetchRestaurants(
  tagSet: TagSet,
  locationBias?: { lat: number; lng: number }
): Promise<Restaurant[]> {
  // Runtime guard: ensure this is running in a server context
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

  // Construct the search query — include location if provided
  const locationPart = tagSet.location ? ` in ${tagSet.location}` : "";
  const textQuery = `${tagSet.cuisine} restaurant${locationPart}`;

  const requestBody: Record<string, unknown> = {
    textQuery,
    maxResultCount: 5,
    // Note: priceLevels filter is available in the API but not strictly required
    // We include it to refine results based on budget
  };

  // Add location bias if coordinates are provided
  if (locationBias) {
    requestBody.locationBias = {
      circle: {
        center: {
          latitude: locationBias.lat,
          longitude: locationBias.lng,
        },
        radius: 5000.0, // 5km radius
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
            "places.id,places.displayName,places.rating,places.photos",
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

    // Map the response to our Restaurant type
    const places = data.places || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return places.map((place: any) => ({
      id: place.id || "",
      displayName: place.displayName?.text || "Unknown Restaurant",
      rating: place.rating || 0,
      photoReference: place.photos?.[0]?.name
        ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxWidthPx=400&key=${apiKey}`
        : null,
    }));
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
