/**
 * In-memory rate limiter with TTL cleanup.
 * Uses a Map keyed by `${uid}:${action}` storing request timestamps.
 * Expired entries are removed on every call to prevent memory leaks.
 *
 * Trade-off: limits reset on serverless cold starts. Acceptable for
 * anonymous-auth abuse prevention without external dependencies.
 */

type RateLimitEntry = {
  timestamps: number[];
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterMs?: number;
};

const store = new Map<string, RateLimitEntry>();

/**
 * Checks whether a request is allowed under the specified rate limit.
 *
 * @param uid - The anonymous user ID
 * @param action - The action identifier (e.g. "createSession", "retry:abc123")
 * @param maxRequests - Maximum allowed requests within the window
 * @param windowMs - Time window in milliseconds
 * @returns Whether the request is allowed, and if not, how long until retry
 */
export function checkRateLimit(
  uid: string,
  action: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const key = `${uid}:${action}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get or create entry
  const entry = store.get(key) || { timestamps: [] };

  // Remove expired timestamps (TTL cleanup)
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

  // Check limit
  if (entry.timestamps.length >= maxRequests) {
    // Calculate retry-after: oldest timestamp in window + windowMs - now
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;

    store.set(key, entry);
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 0) };
  }

  // Allow and record
  entry.timestamps.push(now);
  store.set(key, entry);
  return { allowed: true };
}

// Exported for testing only
export function _resetStore(): void {
  store.clear();
}
