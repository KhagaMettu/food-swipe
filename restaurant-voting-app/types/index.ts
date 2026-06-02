import type { Timestamp } from "firebase/firestore";

/**
 * Structured search parameters produced by the AI parser from a natural-language prompt.
 */
export type TagSet = {
  cuisine: string;
  budget: "low" | "medium" | "high";
  groupSize: number;
  location: string;
};

/**
 * A single restaurant record fetched from the Google Places API and cached in Firestore.
 */
export type Restaurant = {
  id: string;
  displayName: string;
  rating: number; // 0.0–5.0
  photoReference: string | null;
  address: string | null;
  priceLevel: string | null;
  websiteUri: string | null;
  googleMapsUri: string | null;
  openNow: boolean | null;
  weekdayHours: string[] | null;
  location: { lat: number; lng: number } | null;
};

/**
 * All possible states a Session can be in.
 */
export type SessionState =
  | "lobby"
  | "active"
  | "waiting"
  | "match"
  | "no_match"
  | "error"
  | "cancelled";

/**
 * The root Firestore document for a voting session.
 */
export type Session = {
  id: string;
  hostUid: string;
  state: SessionState;
  restaurants: Restaurant[];
  matchedRestaurantId: string | null;
  createdAt: Timestamp;
};

/**
 * A participant in a session (stored in the participants/ subcollection).
 */
export type Participant = {
  uid: string;
  joinedAt: Timestamp;
  /** false when the participant has been disconnected for more than 30 seconds */
  active: boolean;
  completedAt: Timestamp | null;
};

/**
 * A single vote cast by a participant for a restaurant.
 * In Firestore this is stored as a map field on the votes/{uid} document:
 *   { [restaurantId]: "accept" | "reject" }
 */
export type Vote = {
  restaurantId: string;
  uid: string;
  decision: "accept" | "reject";
  recordedAt: Timestamp;
};
