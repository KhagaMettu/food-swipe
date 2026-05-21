/**
 * Server-side environment variable validation.
 * This module is imported at boot time and throws a descriptive error
 * if any required server-side key is missing.
 *
 * IMPORTANT: This file must only be imported in Server Actions and API routes.
 * It must never be imported by client components.
 */

const REQUIRED_SERVER_ENV_VARS = [
  "GOOGLE_PLACES_API_KEY",
  "OPENAI_API_KEY",
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
] as const;

type ServerEnvVar = (typeof REQUIRED_SERVER_ENV_VARS)[number];

function validateServerEnv(): Record<ServerEnvVar, string> {
  const missing: string[] = [];

  for (const key of REQUIRED_SERVER_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required server-side environment variable(s): ${missing.join(", ")}. ` +
        `Please add them to your .env.local file. ` +
        `See .env.local for the expected format.`
    );
  }

  // Safe to cast — we've verified all keys are present above
  return Object.fromEntries(
    REQUIRED_SERVER_ENV_VARS.map((key) => [key, process.env[key] as string])
  ) as Record<ServerEnvVar, string>;
}

/**
 * Validated server environment variables.
 * Accessing this object will throw at module load time if any key is missing.
 */
export const serverEnv = validateServerEnv();
