import type { Restaurant } from "@/types";

/**
 * Checks whether all active participants have accepted the same restaurant.
 *
 * Requirements 7.3 / 7.4 / Property 9:
 * - Returns the matched restaurant ID when every active participant has an
 *   "accept" vote for that restaurant.
 * - Inactive participants are excluded from the evaluation.
 * - Returns null when no restaurant has unanimous acceptance.
 *
 * @param restaurants        The ordered list of restaurants in the session.
 * @param votes              Map of uid → { restaurantId → "accept" | "reject" }.
 * @param activeParticipants UIDs of participants currently marked active.
 */
export function checkForMatch(
  restaurants: Restaurant[],
  votes: Record<string, Record<string, "accept" | "reject">>,
  activeParticipants: string[]
): string | null {
  // No active participants → no match possible
  if (activeParticipants.length === 0) {
    return null;
  }

  for (const restaurant of restaurants) {
    const allAccepted = activeParticipants.every(
      (uid) => votes[uid]?.[restaurant.id] === "accept"
    );
    if (allAccepted) {
      return restaurant.id;
    }
  }

  return null;
}
