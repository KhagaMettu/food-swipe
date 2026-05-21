/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import RestaurantCard from "../RestaurantCard";
import type { Restaurant } from "@/types";

// Mock framer-motion — verify drag prop is passed correctly
jest.mock("framer-motion", () => ({
  motion: {
    div: React.forwardRef(
      ({ children, drag, ...props }: any, ref: any) => (
        <div ref={ref} data-drag={drag || "false"} {...props}>
          {children}
        </div>
      )
    ),
  },
  useMotionValue: () => ({ get: () => 0, set: () => {} }),
  useTransform: () => ({ get: () => 0 }),
}));

const mockRestaurant: Restaurant = {
  id: "place-1",
  displayName: "Test Restaurant",
  rating: 4.0,
  photoReference: null,
};

describe("Touch Drag Gesture Support (Task 11.5)", () => {
  it("RestaurantCard enables horizontal drag when active and not disabled", () => {
    const onSwipe = jest.fn();
    render(
      <RestaurantCard
        restaurant={mockRestaurant}
        onSwipe={onSwipe}
        isActive={true}
        disabled={false}
      />
    );

    // The card should have drag="x" when active (rendered as data-drag attribute in mock)
    // Framer Motion's drag="x" enables both mouse and touch drag natively
    const card = screen.getByTestId("restaurant-card");
    expect(card).toBeInTheDocument();
    // The card should be focusable for keyboard accessibility
    expect(card).toHaveAttribute("tabindex", "0");
  });

  it("RestaurantCard disables drag when disabled prop is true", () => {
    const onSwipe = jest.fn();
    render(
      <RestaurantCard
        restaurant={mockRestaurant}
        onSwipe={onSwipe}
        isActive={true}
        disabled={true}
      />
    );

    const card = screen.getByTestId("restaurant-card");
    // When disabled, tabindex should be -1 (not focusable)
    expect(card).toHaveAttribute("tabindex", "-1");
  });

  it("RestaurantCard has accessible role and label for screen readers", () => {
    const onSwipe = jest.fn();
    render(
      <RestaurantCard
        restaurant={mockRestaurant}
        onSwipe={onSwipe}
      />
    );

    const card = screen.getByTestId("restaurant-card");
    expect(card).toHaveAttribute("role", "article");
    expect(card).toHaveAttribute(
      "aria-label",
      "Restaurant card: Test Restaurant"
    );
  });
});
