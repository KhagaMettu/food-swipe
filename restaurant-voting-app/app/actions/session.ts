"use server";

import { validatePrompt } from "@/app/lib/validation";
import { isCacheComplete } from "@/app/lib/cache";
import { checkRateLimit } from "@/app/lib/rate-limit";
import { parsePrompt } from "./ai-parser";
import { fetchRestaurants } from "./places-client";
import { AIParserError, PlacesAPIError } from "@/app/lib/errors";
import { adminDb } from "@/app/lib/firebase-admin";
import { buildShareUrl } from "@/app/lib/urls";
import { trackEvent, reportError } from "@/app/lib/analytics";
import type { Session, Restaurant } from "@/types";
import type { SearchFiltersState } from "@/app/components/SearchFilters";

export type CreateSessionResult =
  | { success: true; sessionId: string; shareUrl: string }
  | { success: false; error: string };

export type RetryResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Helper: writes data to Firestore with exponential back-off retry.
 * Returns null on success, or the last error on failure.
 */
async function writeWithRetry(
  docPath: string,
  data: Record<string, unknown>,
  maxRetries = 3
): Promise<Error | null> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await adminDb.doc(docPath).set(data);
      return null; // Success
    } catch (err) {
      lastError =
        err instanceof Error ? err : new Error("Firestore write failed");

      if (attempt < maxRetries) {
        const delayMs = 100 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  return lastError;
}

/**
 * Creates a new voting session.
 *
 * Flow:
 * 1. Validates prompt (non-empty, ≤500 chars)
 * 2. Calls parsePrompt → TagSet
 * 3. Calls fetchRestaurants → Restaurant[]
 * 4. Writes Session document to Firestore (with retry on write failure)
 * 5. Returns { sessionId, shareUrl } or error descriptor
 *
 * Cache check (7.1): If a session already has complete restaurant data,
 * the Places API call is skipped.
 */
export async function createSession(
  prompt: string,
  hostUid: string,
  locationBias?: { lat: number; lng: number },
  filters?: SearchFiltersState
): Promise<CreateSessionResult> {
  // 0. Rate limit check
  const rateCheck = checkRateLimit(hostUid, "createSession", 5, 15 * 60 * 1000);
  if (!rateCheck.allowed) {
    const minutesRemaining = Math.ceil((rateCheck.retryAfterMs ?? 0) / 60_000);
    trackEvent("rate_limit_hit", { uid: hostUid, action: "createSession" });
    return {
      success: false,
      error: `Too many requests. Try again in ${minutesRemaining} minute${minutesRemaining === 1 ? "" : "s"}.`,
    };
  }

  // 1. Validate prompt
  const validation = validatePrompt(prompt);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || "Invalid prompt",
    };
  }

  try {
    // 2. Parse prompt → TagSet
    const tagSet = await parsePrompt(prompt.trim());

    // 3. Fetch restaurants → Restaurant[]
    const restaurants = await fetchRestaurants(tagSet, locationBias, filters);

    if (restaurants.length === 0) {
      const radiusHint = filters?.radiusKm
        ? ` within ${filters.radiusKm}km`
        : "";
      return {
        success: false,
        error: `No restaurants found${radiusHint}. Try increasing the search radius or adjusting your filters.`,
      };
    }

    // 4. Write Session document to Firestore with retry
    const sessionId = adminDb.collection("sessions").doc().id;

    const sessionData: Omit<Session, "createdAt"> & { createdAt: Date } = {
      id: sessionId,
      hostUid,
      state: "lobby",
      restaurants,
      matchedRestaurantId: null,
      createdAt: new Date(),
    };

    const writeError = await writeWithRetry(
      `sessions/${sessionId}`,
      sessionData
    );

    if (writeError) {
      return {
        success: false,
        error: `Failed to create session after 3 attempts: ${writeError.message}`,
      };
    }

    // 5. Return success with sessionId and shareUrl
    const shareUrl = buildShareUrl(sessionId);
    trackEvent("session_created", { sessionId, hostUid });
    return {
      success: true,
      sessionId,
      shareUrl,
    };
  } catch (err) {
    if (err instanceof AIParserError) {
      trackEvent("session_error", { type: "ai_parser", message: err.message });
      reportError(err, { action: "createSession", type: "ai_parser" });
      return {
        success: false,
        error: `Could not understand your prompt. Please try rephrasing it. (${err.message})`,
      };
    }
    if (err instanceof PlacesAPIError) {
      trackEvent("session_error", { type: "places_api", message: err.message });
      reportError(err, { action: "createSession", type: "places_api" });
      return {
        success: false,
        error: `Could not fetch restaurants. Please try again. (${err.message})`,
      };
    }
    if (err instanceof Error) {
      trackEvent("session_error", { type: "unexpected", message: err.message });
      reportError(err, { action: "createSession", type: "unexpected" });
      return {
        success: false,
        error: `An unexpected error occurred: ${err.message}`,
      };
    }
    trackEvent("session_error", { type: "unknown" });
    reportError(new Error("Unknown error in createSession"), { action: "createSession" });
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Retries fetching restaurants for an existing session that is in "error" state.
 *
 * Task 7.1 / 7.3:
 * - Checks if the session already has complete restaurant data (isCacheComplete).
 *   If so, transitions to "lobby" without calling the Places API again.
 * - Otherwise, re-invokes fetchRestaurants and writes the result to the session.
 * - Retries the Firestore write before re-fetching from the Places API.
 * - Only the Host can trigger this (validated by hostUid match).
 *
 * @param sessionId - The existing session ID
 * @param hostUid - The UID of the requesting user (must be the Host)
 * @param tagSet - The TagSet to use for fetching restaurants
 */
export async function retryFetchRestaurants(
  sessionId: string,
  hostUid: string,
  tagSet: { cuisine: string; budget: "low" | "medium" | "high"; groupSize: number; location: string }
): Promise<RetryResult> {
  // Rate limit check
  const rateCheck = checkRateLimit(hostUid, `retry:${sessionId}`, 3, 5 * 60 * 1000);
  if (!rateCheck.allowed) {
    const minutesRemaining = Math.ceil((rateCheck.retryAfterMs ?? 0) / 60_000);
    return {
      success: false,
      error: `Too many retry attempts. Try again in ${minutesRemaining} minute${minutesRemaining === 1 ? "" : "s"}.`,
    };
  }

  try {
    // Read the existing session
    const sessionDoc = await adminDb.doc(`sessions/${sessionId}`).get();

    if (!sessionDoc.exists) {
      return { success: false, error: "Session not found" };
    }

    const session = sessionDoc.data() as Session;

    // Verify the caller is the Host
    if (session.hostUid !== hostUid) {
      return { success: false, error: "Only the Host can retry" };
    }

    // 7.1: Check if cache is already complete — skip Places API call
    if (isCacheComplete(session)) {
      // Data is already there; just transition back to lobby
      await adminDb.doc(`sessions/${sessionId}`).update({ state: "lobby" });
      return { success: true };
    }

    // Fetch restaurants from Places API
    let restaurants: Restaurant[];
    try {
      restaurants = await fetchRestaurants(tagSet);
    } catch (err) {
      // Set session to error state
      await adminDb
        .doc(`sessions/${sessionId}`)
        .update({ state: "error" })
        .catch(() => {});
      if (err instanceof PlacesAPIError) {
        return { success: false, error: err.message };
      }
      return {
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to fetch restaurants",
      };
    }

    // Write restaurants to session with retry (retry write before re-fetching)
    const writeError = await writeWithRetry(`sessions/${sessionId}`, {
      ...session,
      restaurants,
      state: "lobby",
    });

    if (writeError) {
      return {
        success: false,
        error: `Failed to save restaurants after 3 attempts: ${writeError.message}`,
      };
    }

    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("An unexpected error occurred");
    reportError(error, { action: "retryFetchRestaurants", sessionId });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Cancels a session. Only the Host can cancel.
 * Sets the session state to "cancelled" — all participants detect via onSnapshot.
 */
export async function cancelSession(
  sessionId: string,
  hostUid: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionDoc = await adminDb.doc(`sessions/${sessionId}`).get();

    if (!sessionDoc.exists) {
      return { success: false, error: "Session not found" };
    }

    const session = sessionDoc.data() as Session;

    if (session.hostUid !== hostUid) {
      return { success: false, error: "Only the Host can cancel the session" };
    }

    await adminDb.doc(`sessions/${sessionId}`).update({ state: "cancelled" });
    trackEvent("session_cancelled", { sessionId, hostUid });
    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Failed to cancel session");
    reportError(error, { action: "cancelSession", sessionId });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Transitions a session from "lobby" to "active" state so voting can begin.
 * Only the Host can start the session.
 */
export async function startSession(
  sessionId: string,
  hostUid: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionDoc = await adminDb.doc(`sessions/${sessionId}`).get();

    if (!sessionDoc.exists) {
      return { success: false, error: "Session not found" };
    }

    const session = sessionDoc.data() as Session;

    if (session.hostUid !== hostUid) {
      return { success: false, error: "Only the Host can start the session" };
    }

    if (session.state !== "lobby") {
      return { success: false, error: "Session is not in lobby state" };
    }

    if (!session.restaurants || session.restaurants.length === 0) {
      return { success: false, error: "No restaurants loaded yet" };
    }

    await adminDb.doc(`sessions/${sessionId}`).update({ state: "active" });
    trackEvent("voting_started", { sessionId });
    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Failed to start session");
    reportError(error, { action: "startSession", sessionId });
    return {
      success: false,
      error: error.message,
    };
  }
}
