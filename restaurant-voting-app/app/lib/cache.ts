import type { Session } from "@/types";

/**
 * Checks whether a Session document already contains a complete set of
 * restaurant data, meaning no Places API call is needed.
 *
 * Requirements 10.2 / 10.3 / Property 6:
 * A session is considered cache-complete when:
 * - It has at least one restaurant entry
 * - Every entry has all required fields: id, displayName, rating, and
 *   photoReference (which may be null, but the key must be present)
 */
export function isCacheComplete(session: Session): boolean {
  if (!session.restaurants || session.restaurants.length === 0) {
    return false;
  }

  return session.restaurants.every(
    (r) =>
      typeof r.id === "string" &&
      r.id.length > 0 &&
      typeof r.displayName === "string" &&
      r.displayName.length > 0 &&
      typeof r.rating === "number" &&
      // photoReference can be null but the key must exist on the object
      "photoReference" in r
  );
}
