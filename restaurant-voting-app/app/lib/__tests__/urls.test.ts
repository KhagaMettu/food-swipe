import { buildShareUrl, extractSessionId } from "../urls";

describe("buildShareUrl", () => {
  it("returns /session/{sessionId}", () => {
    expect(buildShareUrl("abc123")).toBe("/session/abc123");
  });

  it("round-trip: extractSessionId recovers the original sessionId", () => {
    const id = "session-xyz-789";
    const url = buildShareUrl(id);
    expect(extractSessionId(url)).toBe(id);
  });

  it("handles session IDs with special characters", () => {
    const id = "abc-def_123";
    const url = buildShareUrl(id);
    expect(url).toBe("/session/abc-def_123");
    expect(extractSessionId(url)).toBe(id);
  });

  it("extractSessionId returns null for non-matching URLs", () => {
    expect(extractSessionId("/other/path")).toBeNull();
    expect(extractSessionId("session/abc")).toBeNull();
    expect(extractSessionId("")).toBeNull();
  });
});
