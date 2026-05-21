/**
 * Validates a natural-language prompt submitted by the Host.
 *
 * Rules (Requirements 1.6):
 * - Must be non-empty after trimming whitespace
 * - Must not exceed 500 characters (measured on the trimmed string)
 */
export function validatePrompt(input: string): { valid: boolean; error?: string } {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Prompt cannot be empty." };
  }

  if (trimmed.length > 500) {
    return {
      valid: false,
      error: `Prompt must be 500 characters or fewer (currently ${trimmed.length}).`,
    };
  }

  return { valid: true };
}
