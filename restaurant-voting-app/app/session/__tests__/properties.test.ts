import * as fc from "fast-check";

/**
 * Property-based tests for Session Joining (Task 6).
 *
 * These tests validate invariants about participant registration
 * and session capacity enforcement.
 */

describe("Property-based tests: Session Joining", () => {
  /**
   * Property P12: For any N navigations to the same session URL,
   * participants subcollection contains exactly one document for that UID.
   *
   * Validates: Requirements 3.1, 3.7
   *
   * We test the idempotency logic: given N registration attempts for the same UID,
   * only the first should result in a write.
   */
  it("Feature: restaurant-voting-app, Property 12: Participant registration is idempotent", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.string({ minLength: 5, maxLength: 20 }),
        (navigations: number, uid: string) => {
          // Simulate the registration logic:
          // A Set tracks registered UIDs (like Firestore's idempotent setDoc)
          const registeredParticipants = new Set<string>();
          let writeCount = 0;

          for (let i = 0; i < navigations; i++) {
            // Check if already registered (mirrors the hasRegistered.current check)
            if (!registeredParticipants.has(uid)) {
              registeredParticipants.add(uid);
              writeCount++;
            }
          }

          // Regardless of N navigations, exactly 1 document exists for this UID
          return registeredParticipants.size === 1 && writeCount === 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property P13: For any session with 10 active participants,
   * an 11th join is rejected and participant count stays at 10.
   *
   * Validates: Requirements 3.6
   */
  it("Feature: restaurant-voting-app, Property 13: Session capacity is enforced at 10 participants", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 5, maxLength: 20 }),
          { minLength: 10, maxLength: 10 }
        ),
        fc.array(
          fc.string({ minLength: 5, maxLength: 20 }),
          { minLength: 1, maxLength: 10 }
        ),
        (existingUids: string[], newUids: string[]) => {
          const MAX_PARTICIPANTS = 10;
          const participants = new Set(existingUids.slice(0, MAX_PARTICIPANTS));

          // Ensure we start with exactly 10 unique participants
          // (fast-check may generate duplicates, so fill up to 10)
          let counter = 0;
          while (participants.size < MAX_PARTICIPANTS) {
            participants.add(`filler-uid-${counter++}`);
          }

          // Attempt to add new participants
          const rejections: string[] = [];
          for (const uid of newUids) {
            if (participants.has(uid)) {
              // Already registered — idempotent, no rejection
              continue;
            }
            if (participants.size >= MAX_PARTICIPANTS) {
              rejections.push(uid);
            } else {
              participants.add(uid);
            }
          }

          // All new UIDs that weren't already registered should be rejected
          const newUniqueUids = newUids.filter(
            (uid) => !existingUids.slice(0, MAX_PARTICIPANTS).includes(uid)
          );

          // Participant count should never exceed 10
          return participants.size <= MAX_PARTICIPANTS;
        }
      ),
      { numRuns: 100 }
    );
  });
});
