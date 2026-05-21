# Implementation Plan: Restaurant Voting App

## Overview

This plan implements the full restaurant voting app as described in the requirements and design documents. Tasks are ordered so that foundational layers (project setup, shared types, auth) are completed before the features that depend on them. Each task group maps to a distinct vertical slice of the system.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1"]
    },
    {
      "wave": 2,
      "tasks": ["2"]
    },
    {
      "wave": 3,
      "tasks": ["3", "4", "11"]
    },
    {
      "wave": 4,
      "tasks": ["5"]
    },
    {
      "wave": 5,
      "tasks": ["6", "7", "12"]
    },
    {
      "wave": 6,
      "tasks": ["8"]
    },
    {
      "wave": 7,
      "tasks": ["9"]
    },
    {
      "wave": 8,
      "tasks": ["10"]
    },
    {
      "wave": 9,
      "tasks": ["13"]
    }
  ]
}
```

## Tasks

- [ ] 1. Project Setup and Configuration
  - [ ] 1.1 Initialize a Next.js 14+ project with the App Router, TypeScript, and Tailwind CSS
  - [ ] 1.2 Install and configure project dependencies: `firebase`, `framer-motion`, `ai` (Vercel AI SDK), `zod`, `fast-check`
  - [ ] 1.3 Create `.env.local` with placeholder keys for `GOOGLE_PLACES_API_KEY`, `OPENAI_API_KEY` (or equivalent AI provider key), and `NEXT_PUBLIC_FIREBASE_*` config values; add `.env.local` to `.gitignore`
  - [ ] 1.4 Add startup environment-variable validation in `app/lib/env.ts` that throws a descriptive error identifying any missing server-side key (`GOOGLE_PLACES_API_KEY`, AI provider key) at boot time
  - [ ] 1.5 Initialize Firebase project (Auth + Firestore) and add `app/lib/firebase.ts` (client SDK) and `app/lib/firebase-admin.ts` (Admin SDK, server-only)
  - [ ] 1.6 Configure Firestore security rules as specified in the design document and commit `firestore.rules`
  - [ ] 1.7 Set up Firebase Emulator Suite for local development and testing (`firebase.json`, `emulator` scripts in `package.json`)

- [ ] 2. Shared Types and Pure Utility Functions
  - [ ] 2.1 Create `types/index.ts` with all shared types: `TagSet`, `Restaurant`, `SessionState`, `Session`, `Participant`, `Vote`
  - [ ] 2.2 Implement `validatePrompt(input: string): { valid: boolean; error?: string }` in `app/lib/validation.ts`; accepts non-empty trimmed strings up to 500 characters
  - [ ] 2.3 Implement `buildShareUrl(sessionId: string): string` in `app/lib/urls.ts` that returns `/session/{sessionId}`
  - [ ] 2.4 Implement `buildGoogleMapsDeepLink(restaurant: Restaurant): string | null` in `app/lib/deep-links.ts`; returns `null` when `restaurant.id` is null
  - [ ] 2.5 Implement `buildUberEatsDeepLink(restaurant: Restaurant): string` in `app/lib/deep-links.ts`; encodes `displayName` as the search query
  - [ ] 2.6 Implement `computeSwipeDirection(offsetX: number, cardWidth: number): "accept" | "reject" | null` in `app/lib/swipe.ts`; threshold is 33% of card width
  - [ ] 2.7 Implement `checkForMatch(restaurants: Restaurant[], votes: Record<string, Record<string, "accept" | "reject">>, activeParticipants: string[]): string | null` in `app/lib/match.ts`
  - [ ] 2.8 Implement `isCacheComplete(session: Session): boolean` in `app/lib/cache.ts`; returns `true` when all restaurant entries have all required fields present
  - [ ] 2.9 Write unit tests for all utility functions in `app/lib/__tests__/`:
    - `validatePrompt`: empty string, whitespace-only, exactly 500 chars, 501 chars, normal input
    - `buildShareUrl`: round-trip with `sessionId` extraction
    - `buildGoogleMapsDeepLink`: valid restaurant, null id
    - `buildUberEatsDeepLink`: normal name, special characters in name
    - `computeSwipeDirection`: at threshold, above threshold right, above threshold left, within threshold
    - `checkForMatch`: all accept, partial accept, empty participants, inactive exclusion, no match
    - `isCacheComplete`: complete session, missing fields, empty restaurants array
  - [ ] 2.10 Write property-based tests using fast-check in `app/lib/__tests__/properties.test.ts`:
    - **P1** – `validatePrompt` accepts iff non-empty trimmed AND length ≤ 500 (`fc.string()` with full unicode). **Validates: Requirements 1.6**
    - **P3** – `buildShareUrl` round-trip recovers original sessionId (`fc.string({ minLength: 1 })`). **Validates: Requirements 1.4**
    - **P7** – `computeSwipeDirection` matches ±33% rule for any (offsetX, cardWidth) pair (`fc.float()` pairs). **Validates: Requirements 6.1, 6.2**
    - **P9** – `checkForMatch` returns match iff all active participants accepted; inactive participants are excluded (`fc.record(...)` for vote state with active flags). **Validates: Requirements 7.3, 7.4**
    - **P10** – deep links are non-null and correctly formed for any restaurant with id/displayName (`fc.record(...)` for Restaurant). **Validates: Requirements 8.2, 8.3**

- [ ] 3. Anonymous Authentication
  - [ ] 3.1 Create `app/context/AuthContext.tsx` that exposes `{ uid: string | null, authError: Error | null, loading: boolean }` via React Context
  - [ ] 3.2 Implement `AuthGate` component in `app/components/AuthGate.tsx` that calls `signInAnonymously()` on mount, reuses an existing token on reload, renders children after auth succeeds, and renders a full-page error with a retry button on failure
  - [ ] 3.3 Wrap the root layout (`app/layout.tsx`) with `AuthGate` so every page is covered
  - [ ] 3.4 Write unit tests for `AuthGate`: successful auth renders children, auth failure renders error state, existing token is reused (no second `signInAnonymously` call)

- [ ] 4. Home Page and Prompt Form
  - [ ] 4.1 Create `app/page.tsx` (`HomePage`) with a centered layout containing the `PromptForm` component
  - [ ] 4.2 Implement `PromptForm` in `app/components/PromptForm.tsx`:
    - Single `<textarea>` or `<input>` with a character counter
    - "Find Restaurants" submit button
    - Client-side validation using `validatePrompt` before invoking the Server Action
    - Inline validation error display (empty prompt, >500 chars)
    - Inline server error display (AI parser error, session creation error)
    - Loading state while the Server Action is in flight
    - Disables submit button while `AuthGate` is loading or auth has failed
  - [ ] 4.3 Write unit tests for `PromptForm`: renders correctly, shows validation error on empty submit, shows validation error on >500 char input, disables button during loading, displays server error message

- [ ] 5. Session Creation Server Action
  - [ ] 5.1 Implement `parsePrompt(prompt: string): Promise<TagSet>` in `app/actions/ai-parser.ts` using `generateObject` from the Vercel AI SDK with a Zod schema enforcing `cuisine`, `budget`, and `groupSize`; enforce a 10-second timeout and throw a typed `AIParserError` on timeout or model error
  - [ ] 5.2 Implement `fetchRestaurants(tagSet: TagSet): Promise<Restaurant[]>` in `app/actions/places-client.ts`:
    - `POST /v1/places:searchText` with `X-Goog-FieldMask: places.id,places.displayName,places.rating,places.photos`
    - `maxResultCount: 5`
    - Maps response to `Restaurant[]`
    - Throws a typed `PlacesAPIError` on non-2xx responses
    - Called exclusively from a Server Action (never exposed to the client)
  - [ ] 5.3 Implement `createSession(prompt: string): Promise<CreateSessionResult>` in `app/actions/session.ts`:
    - Validates prompt; returns validation error if invalid
    - Calls `parsePrompt` → `TagSet`
    - Calls `fetchRestaurants` → `Restaurant[]`
    - Writes Session document via Firebase Admin SDK with exponential back-off (max 3 retries) before any re-fetch
    - Returns `{ sessionId, shareUrl }` or a typed error descriptor
  - [ ] 5.4 Wire `PromptForm` to call `createSession` and redirect to `/session/[sessionId]` on success
  - [ ] 5.5 Write unit tests for `createSession`: valid prompt creates session and returns shareUrl, empty prompt returns validation error without calling AI parser, AI parser timeout returns AIParserError, Places API error returns PlacesAPIError, Firestore write failure retries before surfacing error
  - [ ] 5.6 Write property-based tests in `app/actions/__tests__/properties.test.ts`:
    - **P4** – For any TagSet, `fetchRestaurants` request always includes correct field mask and `maxResultCount: 5` (`fc.record(...)` for TagSet). **Validates: Requirements 4.2, 4.3, 10.1, 10.5**
    - **P5** – For any API response (0–5 items), returned list length equals response length and all records are stored (`fc.array(restaurantArb, { maxLength: 5 })`). **Validates: Requirements 4.3, 4.4, 4.5, 10.5**
    - **P6** – For any complete Session doc, `isCacheComplete` returns `true` and no new Places API call is made (`fc.record(...)` for Session with restaurants). **Validates: Requirements 10.2, 10.3**

- [ ] 6. Session Joining and Lobby Screen
  - [ ] 6.1 Create `app/session/[sessionId]/page.tsx` (`SessionPage`) that:
    - Subscribes to `sessions/{sessionId}` via `onSnapshot` on mount
    - Handles participant registration (idempotent `setDoc` on `participants/{uid}`)
    - Enforces the 10-participant cap and shows a "Session is full" error page when exceeded
    - Renders the correct screen based on `session.state`
    - Shows a "Session not found" error page when the session ID does not exist
    - Redirects to the Match screen if the session is already in `"match"` state on join
  - [ ] 6.2 Implement `LobbyScreen` in `app/components/LobbyScreen.tsx`:
    - Displays session name and live participant count via `onSnapshot` on `participants/` subcollection
    - Updates count within 2 seconds of any join/leave
    - Shows a loading indicator while restaurant data is being fetched
  - [ ] 6.3 Implement `onDisconnect()` handler in `SessionPage` that sets `participants/{uid}.active = false` after 30 seconds of lost connectivity
  - [ ] 6.4 Write unit tests for `SessionPage`: renders LobbyScreen for lobby state, renders "Session not found" for missing session, renders Match screen for match state, registers participant exactly once on multiple navigations, rejects 11th participant
  - [ ] 6.5 Write property-based tests:
    - **P12** – For any N navigations to the same session URL, `participants` subcollection contains exactly one document for that UID (`fc.integer({ min: 1, max: 20 })`). **Validates: Requirements 3.1, 3.7**
    - **P13** – For any session with 10 active participants, an 11th join is rejected and participant count stays at 10 (`fc.record(...)` for full session). **Validates: Requirements 3.6**

- [ ] 7. Restaurant Data Retrieval and Caching
  - [ ] 7.1 Extend `createSession` to check `isCacheComplete` before calling `fetchRestaurants`; if the Session document already has complete restaurant data, skip the Places API call
  - [ ] 7.2 Ensure `fetchRestaurants` is only ever called from within a `"use server"` context; add a runtime guard that returns an error response if called outside a valid Server Action context
  - [ ] 7.3 Implement the Host retry flow: when `session.state === "error"`, display a retry button in `LobbyScreen` / `ErrorScreen` that re-invokes the `fetchRestaurants` Server Action without creating a new Session
  - [ ] 7.4 Write unit tests for caching: session with complete restaurant data does not trigger a new Places API call; session with missing restaurant data does trigger a call; Firestore write failure after successful Places API call retries the write before re-fetching

- [ ] 8. Swipe Deck and Restaurant Card Components
  - [ ] 8.1 Implement `RestaurantCard` in `app/components/RestaurantCard.tsx`:
    - `motion.div` with `drag="x"` and `dragConstraints={{ left: 0, right: 0 }}`
    - `onDragEnd` calls `computeSwipeDirection`; if threshold exceeded, calls `onSwipe(direction)` and plays exit animation via Framer Motion
    - ✗ / ✓ buttons that call `onSwipe` directly (same code path as drag)
    - Disables drag and buttons once a vote is recorded for this card
    - Displays `displayName`, `rating` formatted to one decimal place, photo (with placeholder fallback), and `alt` text containing `displayName`
    - Supports left/right arrow key presses as keyboard alternatives
    - Visible focus indicator when keyboard navigation is active
  - [ ] 8.2 Implement `SwipeDeck` in `app/components/SwipeDeck.tsx`:
    - Renders stacked deck: active card in foreground, up to 2 peek cards behind
    - Manages `currentIndex` state; next card becomes interactive only after exit animation completes
    - Displays "X of Y remaining" progress counter
    - Transitions to `WaitingScreen` after the last card is swiped
    - Writes vote to `sessions/{sessionId}/votes/{uid}` via Firestore client SDK on each swipe; shows error notification and blocks deck advance if write fails; provides retry button
  - [ ] 8.3 Implement `WaitingScreen` in `app/components/WaitingScreen.tsx` with a "Waiting for others…" message
  - [ ] 8.4 Write unit tests for `RestaurantCard`: renders name, rating, photo; renders placeholder when photo is null; ✗ button triggers reject swipe; ✓ button triggers accept swipe; drag past threshold triggers swipe; drag within threshold does not trigger swipe; duplicate swipe on same card is ignored; alt text contains restaurant name
  - [ ] 8.5 Write unit tests for `SwipeDeck`: progress counter shows correct values; transitions to WaitingScreen after last card; deck does not advance when Firestore write fails
  - [ ] 8.6 Write property-based tests:
    - **P11** – For any `Restaurant` object, `RestaurantCard` output contains `displayName`, rating to one decimal place, photo or placeholder, and alt text with `displayName` (`fc.record(...)` for Restaurant). **Validates: Requirements 5.1, 5.2, 5.3, 11.4**
    - **P8** – For any sequence of swipe events on the same (uid, restaurantId) pair, only the first event is recorded and subsequent events are ignored (`fc.array(swipeEventArb, { minLength: 2 })`). **Validates: Requirements 6.7**

- [ ] 9. Real-Time Vote Tracking and Match Detection
  - [ ] 9.1 Add a `onSnapshot` listener on `sessions/{sessionId}/votes/` in `SessionPage` that runs `checkForMatch` after every update
  - [ ] 9.2 When `checkForMatch` returns a non-null restaurant ID, write `{ state: "match", matchedRestaurantId }` to the Session document via the Firestore client SDK (last-write-wins is safe; all clients write the same value)
  - [ ] 9.3 When all cards are swiped with no match, write `{ state: "no_match" }` to the Session document and render `NoMatchScreen` with a "Start New Session" button
  - [ ] 9.4 Implement `NoMatchScreen` in `app/components/NoMatchScreen.tsx` with a "No match found" message and a "Start New Session" button that navigates to `/`; include a fallback notification with a retry option if the screen fails to render
  - [ ] 9.5 Write unit tests for match detection logic: all-accept triggers match write, partial-accept does not trigger match, inactive participants are excluded, no-match after all cards swiped writes no_match state

- [ ] 10. Match Screen
  - [ ] 10.1 Implement `MatchScreen` in `app/components/MatchScreen.tsx`:
    - Displays matched restaurant name, photo, and rating (one decimal place)
    - "Open in Google Maps" button using `buildGoogleMapsDeepLink`; disabled with explanatory tooltip if deep link is unavailable
    - "Order on UberEats" button using `buildUberEatsDeepLink`
    - Framer Motion entrance animation completing within 1 second
    - "Start New Session" button for the Host (navigates to `/`)
    - "Go to Home" button for non-Host Participants (navigates to `/`)
  - [ ] 10.2 Wire `SessionPage` to render `MatchScreen` when `session.state === "match"`, passing `session.matchedRestaurantId` to look up the restaurant from `session.restaurants`
  - [ ] 10.3 Write unit tests for `MatchScreen`: renders restaurant name, photo, rating; Google Maps button is present and enabled when id is available; Google Maps button is disabled with tooltip when id is null; UberEats button contains encoded displayName; Host sees "Start New Session"; non-Host sees "Go to Home"

- [ ] 11. Responsive and Accessible UI
  - [ ] 11.1 Audit all pages and components for horizontal scrolling or clipped content at 320px, 375px, 768px, and 1440px viewport widths; fix any layout issues with Tailwind responsive utilities
  - [ ] 11.2 Verify and fix color contrast ratios to meet WCAG 2.1 Level AA (4.5:1 for normal text, 3:1 for large text) across all text elements and interactive states
  - [ ] 11.3 Ensure all restaurant photo `<img>` elements have non-empty `alt` text containing the restaurant's `displayName` and not solely generic terms
  - [ ] 11.4 Confirm left/right arrow key support on `RestaurantCard` is implemented (covered in 8.1) and add a visible focus ring via Tailwind `focus-visible:ring` utilities
  - [ ] 11.5 Verify native touch drag gestures work on touch devices (Framer Motion `drag` handles this; add a smoke test)

- [ ] 12. Accessibility Tests
  - [ ] 12.1 Install `jest-axe` and add automated accessibility tests for all page states: home page, lobby, swipe deck, waiting, match, no-match, error, session-not-found
  - [ ] 12.2 Create a manual accessibility checklist document at `docs/accessibility-checklist.md` covering: keyboard navigation (arrow keys for swipe), visible focus indicator, screen reader announcement of match event, color contrast verification

- [ ] 13. Integration and End-to-End Tests
  - [ ] 13.1 Write Firebase Emulator integration tests in `tests/integration/`:
    - Session creation end-to-end: prompt → TagSet → restaurants → Firestore document
    - Participant join: navigating to session URL registers participant exactly once
    - Real-time vote propagation: vote written by one client appears in another client's snapshot within 2 seconds
    - Match detection: all-accept scenario triggers state transition to `"match"`
    - No-match detection: all cards swiped with no unanimous accept → `"no_match"` state
    - Disconnection: participant marked inactive after simulated disconnect; match proceeds with remaining active participants
    - Session full: 11th join attempt is rejected
  - [ ] 13.2 Install Playwright and write end-to-end tests in `tests/e2e/`:
    - Happy path: Host creates session → 2 participants join → all swipe right on same restaurant → Match screen appears with correct deep links
    - No-match path: all participants swipe left on all cards → No Match screen
    - Error path: Places API returns error → Host retries → session recovers
  - [ ] 13.3 Add `test:integration` and `test:e2e` scripts to `package.json`; ensure CI can run them against the Firebase Emulator

## Notes

- All Server Actions (`app/actions/`) must be decorated with `"use server"` and must never be imported by client components directly — only invoked via form actions or `startTransition`.
- The Firebase Admin SDK (`firebase-admin.ts`) must only be imported in Server Actions and API routes, never in client components.
- Property-based tests use **fast-check** with a minimum of 100 iterations per property. Tag each test with the format: `Feature: restaurant-voting-app, Property {N}: {property_text}`.
- The Google Places API and AI provider API keys must never appear in any client-side JavaScript bundle. Verify this with `next build` and inspect the output chunks.
- Firestore writes for votes use the client SDK (participants write their own `votes/{uid}` document). Session state transitions (lobby → active → match/no_match) use the client SDK from the detecting client; session creation uses the Admin SDK.
- Match detection runs client-side inside the `onSnapshot` callback. Last-write-wins is safe because all clients detecting a match write the same `matchedRestaurantId`.
