/**
 * Computes the swipe direction from a drag gesture.
 *
 * Requirements 6.1 / 6.2 / Property 7:
 * - Returns "accept"  when offsetX >  0.33 * cardWidth  (dragged right past threshold)
 * - Returns "reject"  when offsetX < -0.33 * cardWidth  (dragged left past threshold)
 * - Returns null      when the drag is within the ±33% threshold (no vote registered)
 *
 * @param offsetX   Horizontal drag offset in pixels (positive = right, negative = left)
 * @param cardWidth Width of the card in pixels (must be > 0 for a meaningful result)
 */
export function computeSwipeDirection(
  offsetX: number,
  cardWidth: number
): "accept" | "reject" | null {
  const threshold = 0.33 * cardWidth;

  if (offsetX > threshold) {
    return "accept";
  }

  if (offsetX < -threshold) {
    return "reject";
  }

  return null;
}
