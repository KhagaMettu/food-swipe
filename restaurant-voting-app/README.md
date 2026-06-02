# MunchMatch

**MunchMatch** is a real-time multiplayer restaurant-voting app — think Tinder for deciding where to eat. A group of friends describes what they're in the mood for, and everyone swipes yes or no on restaurant suggestions. The first restaurant that gets a unanimous yes from the whole group is the match.

---

## What it does

Deciding where to eat as a group is painful. MunchMatch solves it with a simple flow:

1. **The host describes the vibe** — type something like *"4 friends, Mexican food, medium budget, downtown Belfast"* into the prompt box.
2. **AI parses the prompt** — GPT-4o-mini extracts structured preferences (cuisine, budget, group size, location) from the free-text input.
3. **Restaurants are fetched** — the Google Places API returns up to 5 matching restaurants.
4. **A session is created** — the host gets a shareable link and waits in the lobby while friends join.
5. **Everyone swipes** — participants drag cards left (reject) or right (accept), or use the ✗/✓ buttons. Each vote is written to Firestore in real time.
6. **Match detection runs live** — as votes come in, the app checks whether all active participants have accepted the same restaurant. The moment they do, the session transitions to the match screen.
7. **The match is revealed** — the winning restaurant is shown with its photo, rating, a Google Maps link, and an UberEats order link.
8. **No match?** — if everyone finishes voting with no unanimous pick, a "no match" screen is shown and the host can start a new session.

Sessions support up to 10 participants. Disconnected users are automatically marked inactive after 30 seconds so they don't block the group from reaching a match.

---

## How it works

### Tech stack

| Concern | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion 12 |
| Auth | Firebase Authentication (anonymous sign-in) |
| Database | Cloud Firestore (real-time subscriptions) |
| Server-side Firebase | Firebase Admin SDK |
| AI | Vercel AI SDK + GPT-4o-mini (`generateObject` with Zod schema) |
| Restaurant data | Google Places API (New) — `places:searchText` |
| Validation | Zod |
| Testing | Jest, React Testing Library, jest-axe, Playwright, fast-check |

---

### Architecture

#### Server / client split

All sensitive operations run in **Next.js Server Actions** (`"use server"`):

- `parsePrompt` — calls the OpenAI API to extract structured tags from the user's prompt
- `fetchRestaurants` — calls the Google Places API with the extracted tags
- `createSession` / `startSession` / `retryFetchRestaurants` — write to Firestore via the Admin SDK

The Google Places API key and Firebase Admin credentials never reach the browser.

Client components handle UI rendering, real-time Firestore subscriptions (via the client SDK), and auth state.

#### Authentication

`AuthGate` wraps the entire app. On mount it calls `onAuthStateChanged` — if no session exists it calls `signInAnonymously()`. Every visitor gets a Firebase anonymous UID automatically, with no login required. The UID is exposed app-wide via `AuthContext`.

#### Real-time data flow

The session page (`/session/[sessionId]`) subscribes to the Firestore session document via `onSnapshot`. When the session's `state` field changes, the UI switches screens automatically — no polling, no page reloads.

- **Lobby** — subscribes to the `participants` subcollection for a live participant count
- **Active** — subscribes to the `votes` subcollection; on every update it runs `checkForMatch()` and writes the result back to Firestore if a match is found

#### Session state machine

```
lobby → active → match
                → no_match
       → error  (restaurant fetch failed; host can retry)
```

#### Match detection

`checkForMatch()` is a pure function: given the restaurant list, the votes map, and the list of active participant UIDs, it returns the first restaurant ID where every active participant has voted "accept", or `null`. Inactive participants are excluded from the quorum.

#### Swipe mechanics

`RestaurantCard` uses Framer Motion's `useMotionValue` and `useTransform` for the drag-and-rotate effect. The swipe threshold is 33% of the card width — cards snap back if the drag doesn't cross it. Arrow key navigation and ✗/✓ buttons are provided as accessible alternatives to dragging.

#### Resilience

- Firestore writes retry up to 3 times with exponential backoff (100 ms, 200 ms, 400 ms)
- The retry flow checks whether restaurant data is already cached before calling the Places API again
- Disconnected participants are marked inactive after 30 seconds offline and reactivated on reconnect

---

### Project structure

```
app/
  actions/          # Server Actions (AI parser, Places API, session management)
  components/       # React components (AuthGate, SwipeDeck, RestaurantCard, screens)
  context/          # AuthContext
  lib/              # Pure utilities (match detection, swipe logic, deep links, validation)
  session/[sessionId]/  # Dynamic session route
```

---

## Getting started

### Prerequisites

- Node.js 20+
- A Firebase project with Firestore and Anonymous Auth enabled
- A Google Places API key (New)
- An OpenAI API key

### Environment variables

Create a `.env.local` file in the project root:

```env
# Firebase client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin SDK (server-side only)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Google Places API (server-side only)
GOOGLE_PLACES_API_KEY=

# OpenAI (server-side only)
OPENAI_API_KEY=
```

### Running locally

```bash
npm install
npm run dev
```

To use the Firebase emulator instead of production:

```bash
npm run emulator
```

### Running tests

```bash
# Unit + integration tests
npm test

# End-to-end tests (requires a running dev server)
npm run test:e2e
```
