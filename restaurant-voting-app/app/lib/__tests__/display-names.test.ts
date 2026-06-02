import {
  generateRandomName,
  isNameAllowed,
  sanitizeDisplayName,
} from "@/app/lib/display-names";

describe("generateRandomName", () => {
  it("produces a non-empty string within 20 characters", () => {
    const name = generateRandomName();
    expect(name.length).toBeGreaterThan(0);
    expect(name.length).toBeLessThanOrEqual(20);
  });

  it("produces names in 'Adjective Animal' format", () => {
    const name = generateRandomName();
    const parts = name.split(" ");
    expect(parts.length).toBe(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });
});

describe("isNameAllowed", () => {
  it("blocks profanity", () => {
    expect(isNameAllowed("fuck")).toBe(false);
    expect(isNameAllowed("Shit Head")).toBe(false);
  });

  it("allows clean names", () => {
    expect(isNameAllowed("Hungry Panda")).toBe(true);
    expect(isNameAllowed("TacoLover")).toBe(true);
  });
});

describe("sanitizeDisplayName", () => {
  it("trims whitespace", () => {
    expect(sanitizeDisplayName("  Hello  ")).toBe("Hello");
  });

  it("truncates to 20 characters", () => {
    const longName = "A".repeat(30);
    expect(sanitizeDisplayName(longName)).toBe("A".repeat(20));
  });

  it("handles a name exactly at the limit", () => {
    const name = "A".repeat(20);
    expect(sanitizeDisplayName(name)).toBe(name);
  });
});
