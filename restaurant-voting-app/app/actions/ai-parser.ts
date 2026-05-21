"use server";

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { TagSet } from "@/types";
import { AIParserError } from "@/app/lib/errors";

const TagSetSchema = z.object({
  cuisine: z.string().min(1, "Cuisine is required"),
  budget: z.enum(["low", "medium", "high"]),
  groupSize: z.number().int().positive(),
  location: z.string().describe("City, area, or neighborhood. Empty string if not mentioned."),
});

/**
 * Parses a natural-language prompt into a structured TagSet using the Vercel AI SDK.
 *
 * Requirements:
 * - Uses generateObject with a Zod schema enforcing cuisine, budget, and groupSize
 * - Enforces a 10-second timeout
 * - Throws AIParserError on timeout or model error
 *
 * @param prompt - The natural-language prompt from the Host
 * @returns A TagSet with cuisine, budget, and groupSize
 * @throws AIParserError on timeout or model error
 */
export async function parsePrompt(prompt: string): Promise<TagSet> {
  const timeoutMs = 10000;

  try {
    const result = await Promise.race([
      generateObject({
        model: openai("gpt-4o-mini"),
        schema: TagSetSchema,
        prompt: `Extract dining preferences from this prompt: "${prompt}". 
        
Rules:
- cuisine: the type of food (e.g., "Mexican", "Italian", "Asian fusion")
- budget: one of "low", "medium", or "high"
- groupSize: the number of people (default to 2 if not specified)
- location: the city, area, or neighborhood mentioned (e.g., "Belfast", "downtown", "city centre"). Return an empty string "" if no location is mentioned.

Return a JSON object with these fields.`,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("AI parser timeout after 10 seconds")),
          timeoutMs
        )
      ),
    ]);

    return result.object as TagSet;
  } catch (err) {
    if (err instanceof Error) {
      throw new AIParserError(
        `Failed to parse prompt: ${err.message}`,
        err
      );
    }
    throw new AIParserError("Failed to parse prompt: Unknown error", err);
  }
}
