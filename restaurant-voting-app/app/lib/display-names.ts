/**
 * Display name utilities for session participants.
 *
 * Provides random name generation, profanity filtering, and sanitization.
 */

const ADJECTIVES = [
  "Hungry",
  "Spicy",
  "Crispy",
  "Sizzling",
  "Toasty",
  "Zesty",
  "Savory",
  "Tangy",
  "Smoky",
  "Golden",
  "Crunchy",
  "Hearty",
  "Mellow",
  "Bold",
  "Fresh",
];

const FOOD_ANIMALS = [
  "Panda",
  "Falcon",
  "Tiger",
  "Otter",
  "Fox",
  "Bear",
  "Wolf",
  "Owl",
  "Raven",
  "Hawk",
  "Seal",
  "Moose",
  "Crane",
  "Bison",
  "Lynx",
];

/**
 * Small profanity blocklist for basic filtering (~50 words).
 * This is intentionally minimal — a production app would use a dedicated library.
 */
const PROFANITY_BLOCKLIST = new Set([
  "ass",
  "asshole",
  "bastard",
  "bitch",
  "bollocks",
  "crap",
  "cunt",
  "damn",
  "dick",
  "douche",
  "fag",
  "fuck",
  "goddamn",
  "hell",
  "idiot",
  "jerk",
  "moron",
  "nigger",
  "piss",
  "prick",
  "pussy",
  "shit",
  "slut",
  "twat",
  "whore",
  "wanker",
  "arse",
  "bloody",
  "bugger",
  "bullshit",
  "cock",
  "coon",
  "dammit",
  "dildo",
  "feck",
  "friggin",
  "jackass",
  "knob",
  "minger",
  "nob",
  "pissoff",
  "retard",
  "slag",
  "sod",
  "spaz",
  "tit",
  "tosser",
  "tramp",
  "twit",
  "wank",
]);

/**
 * Generates a random display name from adjective + food-animal.
 * e.g. "Hungry Panda", "Spicy Falcon"
 */
export function generateRandomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = FOOD_ANIMALS[Math.floor(Math.random() * FOOD_ANIMALS.length)];
  return `${adj} ${animal}`;
}

/**
 * Checks if a display name is allowed (not containing profanity).
 * Compares lowercase words against the blocklist.
 */
export function isNameAllowed(name: string): boolean {
  const words = name.toLowerCase().split(/\s+/);
  return !words.some((word) => PROFANITY_BLOCKLIST.has(word));
}

/**
 * Sanitizes a display name: trims whitespace and limits to 20 characters.
 */
export function sanitizeDisplayName(name: string): string {
  return name.trim().slice(0, 20);
}
