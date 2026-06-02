"use server";

/**
 * Server action for reverse geocoding coordinates to a human-readable location name.
 * Uses the Google Geocoding API to convert lat/lng to city/neighborhood level names.
 *
 * Location data is NOT persisted — used only to provide a display name in the UI.
 */

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=locality|neighborhood|sublocality&key=${apiKey}`
    );

    if (!response.ok) {
      return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      // Return the first result's formatted address at city/neighborhood level
      const result = data.results[0];
      // Extract a short name from address_components
      const components: Array<{ long_name: string; types: string[] }> = result.address_components || [];
      const neighborhood = components.find((c) =>
        c.types.includes("neighborhood") || c.types.includes("sublocality")
      );
      const locality = components.find((c) =>
        c.types.includes("locality")
      );

      if (neighborhood && locality) {
        return `${neighborhood.long_name}, ${locality.long_name}`;
      }
      if (locality) {
        return locality.long_name;
      }
      if (neighborhood) {
        return neighborhood.long_name;
      }

      // Fallback to formatted address (truncated)
      const formatted = result.formatted_address as string;
      return formatted.split(",").slice(0, 2).join(",").trim();
    }

    return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  } catch {
    return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  }
}
