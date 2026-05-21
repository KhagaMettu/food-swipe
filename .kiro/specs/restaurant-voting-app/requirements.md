# Requirements Document

## Introduction

A frictionless, web-based multiplayer restaurant voting app that lets a group of friends agree on where to eat without the usual back-and-forth. A "Host" describes the group's preferences in plain English, the app generates a shareable link, and each participant swipes Tinder-style on restaurant cards. When the whole group swipes right on the same restaurant, a "Match" screen appears with direct links to Google Maps and UberEats.

The app is built on Next.js (App Router) with Tailwind CSS and Framer Motion for animations, Firebase Anonymous Auth and Firestore for real-time multiplayer state, the Vercel AI SDK for natural-language parsing, and the Google Places API (New) for restaurant data.

---

## Glossary

- **Host**: The user who initiates a voting session by submitting a natural language prompt.
- **Participant**: Any user (including the Host) who joins a session and swipes on restaurant cards.
- **Session**: A single voting round identified by a unique shareable URL.
- **Lobby**: The waiting room state of a Session before swiping begins.
- **Prompt**: The natural language text entered by the Host describing dining preferences (e.g., "4 friends, Mexican, medium budget").
- **Tag_Set**: The structured JSON object produced by the AI parser from a Prompt (e.g., `{ "cuisine": "Mexican", "budget": "medium", "groupSize": 4 }`).
- **Restaurant_Card**: A UI card displaying a restaurant's name, rating, photo, and a swipe affordance.
- **Swipe**: A left (reject) or right (accept) gesture or button action on a Restaurant_Card.
- **Match**: The state reached when every Participant in a Session has swiped right on the same restaurant.
- **AI_Parser**: The Vercel AI SDK server action that converts a Prompt into a Tag_Set.
- **Places_Client**: The server-side module that calls the Google Places API (New) with strict field masks.
- **Vote_Store**: The Firestore collection that persists each Participant's swipe decisions in real time.
- **Anonymous_Auth**: Firebase Anonymous Authentication that assigns each browser session a unique UID without requiring a password or email.
- **Field_Mask**: The `X-Goog-FieldMask` HTTP header sent with every Google Places API request to restrict returned fields.
- **Deep_Link**: A URL that opens a specific restaurant in Google Maps or UberEats.

---

## Requirements

### Requirement 1: Host Session Creation

**User Story:** As a Host, I want to type a natural language prompt describing my group's dining preferences, so that the app can find relevant restaurants without me filling out a form.

#### Acceptance Criteria

1. THE App SHALL display a single text input and a "Find Restaurants" submit button on the home page.
2. WHEN the Host submits a non-empty Prompt of no more than 500 characters, THE AI_Parser SHALL convert the Prompt into a Tag_Set containing at least `cuisine`, `budget`, and `groupSize` fields.
3. WHEN the AI_Parser produces a Tag_Set, THE App SHALL create a new Session document in Firestore and assign it a unique Session ID.
4. WHEN a Session is created successfully in Firestore, THE App SHALL generate a shareable URL of the form `/session/[sessionId]` and display it to the Host.
5. IF Session creation in Firestore fails, THEN THE App SHALL NOT display a shareable URL and SHALL display an inline error message indicating that the session could not be created.
6. WHEN the Host submits a Prompt, THE App SHALL validate that the Prompt is non-empty and does not exceed 500 characters before calling the AI_Parser; IF the Prompt is empty or exceeds 500 characters, THEN THE App SHALL display an inline validation error and SHALL NOT call the AI_Parser.
7. IF the AI_Parser returns an error or does not respond within 10 seconds, THEN THE App SHALL display an inline error message indicating that the prompt could not be parsed and SHALL allow the Host to resubmit the Prompt.
8. WHEN a Session is created, THE App SHALL automatically assign the Host as the first Participant via Anonymous_Auth.
9. IF Anonymous_Auth fails before the Host submits a Prompt, THEN THE App SHALL display an error message indicating that authentication failed and SHALL NOT allow the Host to submit the Prompt.

---

### Requirement 2: Anonymous Authentication

**User Story:** As a Participant, I want to join a session without creating an account, so that there is no sign-up friction.

#### Acceptance Criteria

1. WHEN a user loads any page in the App, THE Anonymous_Auth module SHALL attempt to sign the user in with Firebase Anonymous Authentication.
2. IF Anonymous_Auth fails due to network issues, Firebase service problems, or browser restrictions, THEN THE App SHALL display an error message indicating that authentication failed and that the user should retry, and SHALL NOT allow the user to join or create a Session.
3. WHEN a user who is already anonymously authenticated reloads any page in the App, THE App SHALL reuse the existing Firebase Anonymous Auth token and SHALL NOT create a new anonymous user.
4. WHILE a user is anonymously authenticated, THE App SHALL use that UID to identify all of the user's swipe actions within a Session.
5. THE App SHALL NOT require an email address, password, phone number, name, or any other personal information from any Participant.

---

### Requirement 3: Session Joining via Shareable Link

**User Story:** As a Participant, I want to click a shared link and immediately join the voting session, so that I can participate without any setup.

#### Acceptance Criteria

1. WHEN a Participant navigates to `/session/[sessionId]` and the Session exists, THE App SHALL register the Participant as a member of that Session automatically, with no confirmation step required from the Participant.
2. WHEN a Participant joins a Session that is in the Lobby state, THE App SHALL display a Lobby waiting screen showing the Session name and the current Participant count.
3. WHILE the Session is in the Lobby state, THE App SHALL update the displayed Participant count within 2 seconds of any Participant joining or leaving, using Firestore's real-time listener.
4. IF a Participant navigates to a Session ID that does not exist in Firestore, THEN THE App SHALL display a "Session not found" error page.
5. IF a Participant navigates to a Session that has already reached the Match state, THEN THE App SHALL display the Match screen directly.
6. IF a Participant attempts to join a Session that already has 10 registered Participants, THEN THE App SHALL reject the join attempt and display an error message indicating that the Session is full.
7. WHEN a Participant who is already registered in a Session navigates to that Session's URL again, THE App SHALL display the appropriate screen for the Session's current state without registering the Participant a second time.

---

### Requirement 4: Restaurant Data Retrieval

**User Story:** As a Participant, I want to see relevant restaurant options based on the Host's preferences, so that the choices are meaningful to the group.

#### Acceptance Criteria

1. WHEN a Session is created, THE Places_Client SHALL query the Google Places API (New) using the Tag_Set fields as search parameters, mapping `cuisine` to the text query, `budget` to a price level filter, and `groupSize` to inform the search context.
2. THE Places_Client SHALL include a Field_Mask header of `places.id,places.displayName,places.rating,places.photos` on every Google Places API request and SHALL NOT include any additional fields.
3. THE Places_Client SHALL request exactly 5 restaurant results per Session query.
4. WHEN the Google Places API returns results, THE App SHALL store up to 5 retrieved restaurant records in the Session's Firestore document so all Participants see the same set of cards.
5. IF the Google Places API returns fewer than 5 results, THEN THE App SHALL display however many results were returned and SHALL NOT show empty or placeholder cards.
6. IF the Google Places API returns an error, THEN THE App SHALL display a user-facing error message and set the Session state to an error state, allowing the Host to retry the restaurant fetch without creating a new Session.
7. WHILE the Session is in a loading or error state awaiting restaurant data, THE App SHALL display a loading indicator to all Participants in the Lobby.
8. THE Places_Client SHALL NOT expose the Google Places API key to the client; all API calls MUST be made from Next.js Server Actions.

---

### Requirement 5: Restaurant Card Display

**User Story:** As a Participant, I want to see a visually clear restaurant card with key information, so that I can make a quick, informed swipe decision.

#### Acceptance Criteria

1. THE App SHALL render each restaurant as a Restaurant_Card displaying the restaurant's display name, star rating expressed as a number out of 5 to one decimal place, and one photo.
2. WHEN a restaurant photo is available from the Google Places API, THE App SHALL display it as the card's background or primary image.
3. IF a restaurant photo is not available, THEN THE App SHALL display a clearly identifiable placeholder image (not a blank space) on the Restaurant_Card.
4. THE App SHALL display Restaurant_Cards in a stacked deck layout, showing the active card in the foreground and up to 2 cards visually peeking behind it, with one card at a time available for swiping.
5. THE App SHALL display a progress counter in the format "X of Y remaining" showing how many cards are left in the deck.
6. WHEN a Participant has swiped all cards in the deck, THE App SHALL remove the deck from view and display the "Waiting for others…" screen.

---

### Requirement 6: Swipe Interaction

**User Story:** As a Participant, I want to swipe left or right on restaurant cards, so that I can express my preference quickly and intuitively.

#### Acceptance Criteria

1. WHEN a Participant drags a Restaurant_Card to the right and releases it past a threshold of 33% of the card's width, THE App SHALL register a right Swipe (accept) for that restaurant.
2. WHEN a Participant drags a Restaurant_Card to the left and releases it past a threshold of 33% of the card's width, THE App SHALL register a left Swipe (reject) for that restaurant.
3. THE App SHALL animate the Restaurant_Card off-screen in the direction of the Swipe using Framer Motion; the next card SHALL NOT become interactive until the exit animation has completed.
4. WHEN a Swipe is registered, THE App SHALL write the Participant's vote (accept or reject) for that restaurant to the Vote_Store in Firestore; IF the Firestore write fails, THEN THE App SHALL display an error notification and SHALL NOT advance to the next card until the write succeeds or the Participant explicitly retries.
5. THE App SHALL provide on-screen tap/click buttons (a ✗ button and a ✓ button) as an alternative to drag gestures for accessibility; activating either button SHALL trigger the same Swipe registration and animation as the corresponding drag gesture.
6. WHEN a Participant has swiped on all 5 Restaurant_Cards, THE App SHALL display a "Waiting for others…" screen.
7. WHILE a Participant is swiping, THE App SHALL prevent duplicate votes by disabling drag interaction and the ✗/✓ buttons on cards that have already been swiped; IF a simultaneous gesture and button activation occur on the same card, THE App SHALL register only the first input received and ignore the second.
8. WHEN a Swipe animation completes, THE App SHALL advance the deck to display the next unvoted Restaurant_Card as the active card.

---

### Requirement 7: Real-Time Vote Tracking

**User Story:** As a Participant, I want the app to know when everyone has voted on the same restaurant, so that a match can be declared without any manual action.

#### Acceptance Criteria

1. WHEN any Participant records a Swipe, THE Vote_Store SHALL update the corresponding vote document in Firestore within 2 seconds under normal network conditions.
2. THE App SHALL use a Firestore real-time listener on the Vote_Store to monitor vote state for all Participants in the Session.
3. WHEN all active Participants in a Session have recorded a right Swipe for the same restaurant, THE App SHALL verify that the right-swipe condition is met for all active Participants before transitioning the Session to the Match state in Firestore; THE App SHALL NOT transition to Match state unless this condition is fully verified.
4. IF a Participant disconnects (loses network connectivity for more than 30 seconds) before completing all swipes, THE App SHALL mark that Participant as inactive and SHALL exclude their pending votes from the match condition, so that the remaining active Participants are not blocked from reaching a Match.
5. WHILE the Session is in the Match state, THE App SHALL display the Match screen to all active Participants within 2 seconds of the state transition via the Firestore real-time listener.
6. IF no restaurant receives a right Swipe from all active Participants after all cards are swiped, THEN THE App SHALL display a "No match found" screen with an option to start a new Session; IF the "No match found" screen fails to display due to a technical error, THEN THE App SHALL fall back to showing a notification with a retry option.

---

### Requirement 8: Match Screen

**User Story:** As a Participant, I want to see a celebratory match screen with actionable links when the group agrees, so that we can immediately act on the decision.

#### Acceptance Criteria

1. WHEN the Session transitions to the Match state, THE App SHALL display the matched restaurant's name, photo, and rating (expressed as a number out of 5 to one decimal place) on the Match screen.
2. WHEN the Match screen loads, THE App SHALL display a "Open in Google Maps" button; IF the Google Maps Deep_Link URL cannot be constructed from the available restaurant data, THEN THE App SHALL disable the button and display an explanatory tooltip.
3. WHEN the Match screen loads, THE App SHALL display an "Order on UberEats" button that opens UberEats with the matched restaurant's name as the search query.
4. THE App SHALL animate the Match screen entrance using Framer Motion with an animation that completes within 1 second of the screen becoming visible.
5. WHEN the Host views the Match screen, THE App SHALL display a "Start New Session" button that navigates the Host back to the home page.
6. WHEN a non-Host Participant views the Match screen, THE App SHALL display a "Go to Home" button that navigates the Participant back to the home page.

---

### Requirement 9: API Key Security

**User Story:** As a developer, I want all third-party API keys to be hidden from the browser, so that credentials are never exposed to end users.

#### Acceptance Criteria

1. THE App SHALL call the Google Places API exclusively from Next.js Server Actions; the Google Places API key SHALL NOT appear in any JavaScript resource served to the browser, including compiled chunks and source maps.
2. THE App SHALL call the Vercel AI SDK exclusively from Next.js Server Actions; the AI provider API key SHALL NOT appear in any JavaScript resource served to the browser, including compiled chunks and source maps.
3. THE App SHALL store all API keys and secrets as server-side environment variables and SHALL NOT hard-code them in any source file.
4. IF any required environment variable (Google Places API key or AI provider API key) is missing at application startup, THEN THE App SHALL fail to start and SHALL log an error message identifying which specific environment variable is missing.
5. IF a function decorated with the `"use server"` directive is invoked from outside a valid Next.js Server Action context, THEN THE App SHALL return an error response and SHALL NOT execute the external API call.

---

### Requirement 10: Performance and Cost Controls

**User Story:** As a developer, I want to minimize Google Places API billing costs, so that the app remains economically viable.

#### Acceptance Criteria

1. THE Places_Client SHALL include the Field_Mask `places.id,places.displayName,places.rating,places.photos` on every Google Places API (New) request and SHALL NOT request any additional fields beyond those listed.
2. THE App SHALL cache the retrieved restaurant results in the Session's Firestore document so that the Google Places API is called exactly once per Session, regardless of how many Participants join.
3. WHEN a Session document already contains a complete set of restaurant data (all required fields present for each of the up to 5 entries), THE Places_Client SHALL NOT make a new Google Places API call for that Session.
4. IF the Firestore write of restaurant data fails after a successful Google Places API call, THEN THE App SHALL retry the Firestore write before making a second Google Places API call, to prevent duplicate billing.
5. THE App SHALL request exactly 5 restaurant results per Google Places API call and SHALL NOT request more results than needed.

---

### Requirement 11: Responsive and Accessible UI

**User Story:** As a Participant, I want the app to work well on my phone, so that I can participate from any device.

#### Acceptance Criteria

1. THE App SHALL render all pages without horizontal scrolling, overlapping content, or clipped text on viewport widths from 320px to 1440px.
2. THE App SHALL meet WCAG 2.1 Level AA minimum contrast ratio requirements (4.5:1 for normal text, 3:1 for large text) for all text elements.
3. THE App SHALL support left and right arrow key presses as keyboard alternatives to swipe gestures on Restaurant_Cards, and SHALL display a visible focus indicator on the active card when keyboard navigation is in use.
4. THE App SHALL display non-empty `alt` text on all restaurant photos that includes the restaurant's name and does not consist solely of generic terms such as "image" or "photo".
5. WHEN a Participant uses a touch device, THE App SHALL support native touch drag gestures for swiping Restaurant_Cards.
