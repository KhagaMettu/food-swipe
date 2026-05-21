import type { Restaurant } from "@/types";

/**
 * Builds a Google Maps deep link for a restaurant.
 *
 * Requirements 8.2: Returns null when restaurant.id is null,
 * so the caller can disable the button and show a tooltip.
 */
export function buildGoogleMapsDeepLink(restaurant: Restaurant): string | null {
  if (!restaurant.id) {
    return null;
  }
  // Use the Places API place ID format for a direct deep link
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    restaurant.displayName
  )}&query_place_id=${encodeURIComponent(restaurant.id)}`;
}

/**
 * Builds an UberEats deep link that opens a search for the restaurant by name.
 *
 * Requirements 8.3: The displayName is URL-encoded as the search query.
 */
export function buildUberEatsDeepLink(restaurant: Restaurant): string {
  return `https://www.ubereats.com/search?q=${encodeURIComponent(
    restaurant.displayName
  )}`;
}
