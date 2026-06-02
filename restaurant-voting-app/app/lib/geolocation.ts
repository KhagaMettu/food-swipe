/**
 * Browser geolocation utility.
 * Wraps navigator.geolocation.getCurrentPosition with a Promise interface
 * and configurable timeout.
 */

export type GeoSuccess = { success: true; lat: number; lng: number };
export type GeoFailure = {
  success: false;
  reason: "denied" | "timeout" | "unavailable";
};
export type GeoResult = GeoSuccess | GeoFailure;

/**
 * Requests the user's current position from the browser Geolocation API.
 *
 * @param timeoutMs - Maximum time to wait for a position (default 10000ms)
 * @returns A typed result indicating success with coordinates or failure with reason
 */
export function getCurrentLocation(timeoutMs = 10_000): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation
    ) {
      resolve({ success: false, reason: "unavailable" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          success: true,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            resolve({ success: false, reason: "denied" });
            break;
          case error.TIMEOUT:
            resolve({ success: false, reason: "timeout" });
            break;
          default:
            resolve({ success: false, reason: "unavailable" });
        }
      },
      {
        enableHighAccuracy: false,
        timeout: timeoutMs,
        maximumAge: 60_000,
      }
    );
  });
}
