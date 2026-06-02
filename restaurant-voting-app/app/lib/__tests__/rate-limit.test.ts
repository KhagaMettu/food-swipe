import { checkRateLimit, _resetStore } from "@/app/lib/rate-limit";

beforeEach(() => {
  _resetStore();
});

describe("checkRateLimit", () => {
  it("allows requests within the limit", () => {
    const result = checkRateLimit("user1", "action", 3, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBeUndefined();
  });

  it("blocks requests exceeding the limit", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit("user1", "action", 3, 60_000);
    }
    const result = checkRateLimit("user1", "action", 3, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeDefined();
    expect(result.retryAfterMs!).toBeGreaterThan(0);
  });

  it("cleans up expired entries so they don't count", () => {
    const now = Date.now();
    jest.spyOn(Date, "now").mockReturnValue(now);

    // Fill the limit
    for (let i = 0; i < 3; i++) {
      checkRateLimit("user1", "action", 3, 1000);
    }

    // Move time forward past the window
    jest.spyOn(Date, "now").mockReturnValue(now + 1001);

    const result = checkRateLimit("user1", "action", 3, 1000);
    expect(result.allowed).toBe(true);

    jest.restoreAllMocks();
  });

  it("tracks different actions independently", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit("user1", "actionA", 3, 60_000);
    }

    // actionA is exhausted
    expect(checkRateLimit("user1", "actionA", 3, 60_000).allowed).toBe(false);
    // actionB is still available
    expect(checkRateLimit("user1", "actionB", 3, 60_000).allowed).toBe(true);
  });

  it("calculates retryAfterMs correctly", () => {
    const now = Date.now();
    jest.spyOn(Date, "now").mockReturnValue(now);

    for (let i = 0; i < 3; i++) {
      checkRateLimit("user1", "action", 3, 10_000);
    }

    // Move forward 4 seconds
    jest.spyOn(Date, "now").mockReturnValue(now + 4000);

    const result = checkRateLimit("user1", "action", 3, 10_000);
    expect(result.allowed).toBe(false);
    // oldest timestamp (now) + windowMs (10000) - current (now+4000) = 6000
    expect(result.retryAfterMs).toBe(6000);

    jest.restoreAllMocks();
  });
});
