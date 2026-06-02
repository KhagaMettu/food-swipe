/**
 * Integration tests: Rate Limiting
 *
 * Validates that rate limiting correctly blocks requests after the threshold is reached
 * and returns proper error messages via the createSession flow.
 */

import { checkRateLimit, _resetStore } from "@/app/lib/rate-limit";

beforeEach(() => {
  _resetStore();
});

describe("Integration: Rate Limiting blocks after threshold", () => {
  it("allows 5 session creations then blocks the 6th within 15 minutes", () => {
    const uid = "test-user";
    const action = "createSession";
    const maxRequests = 5;
    const windowMs = 15 * 60 * 1000; // 15 minutes

    // First 5 requests should succeed
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(uid, action, maxRequests, windowMs);
      expect(result.allowed).toBe(true);
      expect(result.retryAfterMs).toBeUndefined();
    }

    // 6th request should be blocked
    const blocked = checkRateLimit(uid, action, maxRequests, windowMs);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeDefined();
    expect(blocked.retryAfterMs!).toBeGreaterThan(0);
    expect(blocked.retryAfterMs!).toBeLessThanOrEqual(windowMs);
  });

  it("returns meaningful retryAfterMs that decreases over time", () => {
    const uid = "test-user-2";
    const action = "createSession";
    const windowMs = 10_000;
    const now = Date.now();

    jest.spyOn(Date, "now").mockReturnValue(now);

    // Fill the limit
    for (let i = 0; i < 5; i++) {
      checkRateLimit(uid, action, 5, windowMs);
    }

    // Check immediately - should be close to full window
    const blockedNow = checkRateLimit(uid, action, 5, windowMs);
    expect(blockedNow.allowed).toBe(false);
    expect(blockedNow.retryAfterMs).toBe(windowMs);

    // Check at half the window - retryAfterMs should decrease
    jest.spyOn(Date, "now").mockReturnValue(now + windowMs / 2);
    const blockedLater = checkRateLimit(uid, action, 5, windowMs);
    expect(blockedLater.allowed).toBe(false);
    expect(blockedLater.retryAfterMs).toBe(windowMs / 2);

    jest.restoreAllMocks();
  });

  it("allows requests again after the window expires", () => {
    const uid = "test-user-3";
    const action = "createSession";
    const windowMs = 1000;
    const now = Date.now();

    jest.spyOn(Date, "now").mockReturnValue(now);

    // Fill the limit
    for (let i = 0; i < 5; i++) {
      checkRateLimit(uid, action, 5, windowMs);
    }

    // Move past the window
    jest.spyOn(Date, "now").mockReturnValue(now + windowMs + 1);

    const result = checkRateLimit(uid, action, 5, windowMs);
    expect(result.allowed).toBe(true);

    jest.restoreAllMocks();
  });
});
