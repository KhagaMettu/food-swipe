import { computeSwipeDirection } from "../swipe";

describe("computeSwipeDirection", () => {
  const cardWidth = 300;
  const threshold = 0.33 * cardWidth; // 99

  it("returns 'accept' when offsetX is exactly at the right threshold", () => {
    // threshold is exclusive — exactly at threshold should still be null
    // (offsetX > threshold, not >=)
    expect(computeSwipeDirection(threshold, cardWidth)).toBeNull();
  });

  it("returns 'accept' when offsetX is just above the right threshold", () => {
    expect(computeSwipeDirection(threshold + 0.01, cardWidth)).toBe("accept");
  });

  it("returns 'accept' for a large positive offset", () => {
    expect(computeSwipeDirection(200, cardWidth)).toBe("accept");
  });

  it("returns 'reject' when offsetX is exactly at the left threshold", () => {
    // threshold is exclusive — exactly at -threshold should still be null
    expect(computeSwipeDirection(-threshold, cardWidth)).toBeNull();
  });

  it("returns 'reject' when offsetX is just past the left threshold", () => {
    expect(computeSwipeDirection(-threshold - 0.01, cardWidth)).toBe("reject");
  });

  it("returns 'reject' for a large negative offset", () => {
    expect(computeSwipeDirection(-200, cardWidth)).toBe("reject");
  });

  it("returns null when offsetX is within the threshold (positive side)", () => {
    expect(computeSwipeDirection(50, cardWidth)).toBeNull();
  });

  it("returns null when offsetX is within the threshold (negative side)", () => {
    expect(computeSwipeDirection(-50, cardWidth)).toBeNull();
  });

  it("returns null when offsetX is zero", () => {
    expect(computeSwipeDirection(0, cardWidth)).toBeNull();
  });

  it("works correctly with a different card width", () => {
    const w = 400;
    const t = 0.33 * w; // 132
    expect(computeSwipeDirection(t + 1, w)).toBe("accept");
    expect(computeSwipeDirection(-(t + 1), w)).toBe("reject");
    expect(computeSwipeDirection(t - 1, w)).toBeNull();
  });
});
