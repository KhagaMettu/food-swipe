/**
 * Typed error classes for the session creation flow.
 * These live in a standard utility file (not "use server") so they can be
 * exported and imported freely by both server actions and tests.
 */

export class AIParserError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "AIParserError";
  }
}

export class PlacesAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "PlacesAPIError";
  }
}
