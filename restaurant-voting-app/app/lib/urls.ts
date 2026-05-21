/**
 * Builds the shareable URL path for a session.
 *
 * Requirements 1.4: URL must be of the form /session/{sessionId}
 */
export function buildShareUrl(sessionId: string): string {
  return `/session/${sessionId}`;
}

/**
 * Extracts the session ID from a share URL produced by buildShareUrl.
 * Returns null if the URL does not match the expected pattern.
 */
export function extractSessionId(shareUrl: string): string | null {
  const match = shareUrl.match(/^\/session\/(.+)$/);
  return match ? match[1] : null;
}
