// TODO: Replace console-based implementations with a real analytics provider
// (e.g. Sentry for error tracking, PostHog or Mixpanel for event analytics).
// The interface is designed so that swapping providers requires changes only in this file.

/**
 * Tracks a named event with optional properties.
 * - Development: logs to console
 * - Production: no-op (replace with real provider)
 */
export function trackEvent(
  name: string,
  properties?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === "development") {
    console.log(`[analytics] ${name}`, properties ?? "");
  }
}

/**
 * Reports an error with optional structured context.
 * Logs to console in all environments (replace with Sentry/etc. for production).
 */
export function reportError(
  error: Error,
  context?: Record<string, unknown>
): void {
  console.error("[error]", {
    message: error.message,
    stack: error.stack,
    ...context,
  });
}
