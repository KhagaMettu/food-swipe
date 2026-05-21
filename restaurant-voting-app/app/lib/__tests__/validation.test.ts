import { validatePrompt } from "../validation";

describe("validatePrompt", () => {
  it("rejects an empty string", () => {
    const result = validatePrompt("");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("rejects a whitespace-only string", () => {
    const result = validatePrompt("   \t\n  ");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("accepts a string of exactly 500 characters", () => {
    const input = "a".repeat(500);
    const result = validatePrompt(input);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects a string of 501 characters", () => {
    const input = "a".repeat(501);
    const result = validatePrompt(input);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("accepts a normal non-empty input", () => {
    const result = validatePrompt("4 friends, Mexican food, medium budget");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("trims whitespace before checking length — 500 chars of content with surrounding spaces is valid", () => {
    const input = "  " + "a".repeat(500) + "  ";
    const result = validatePrompt(input);
    expect(result.valid).toBe(true);
  });

  it("trims whitespace before checking length — 501 chars of content with surrounding spaces is invalid", () => {
    const input = "  " + "a".repeat(501) + "  ";
    const result = validatePrompt(input);
    expect(result.valid).toBe(false);
  });
});
