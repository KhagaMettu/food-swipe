/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import RestaurantCard from "../RestaurantCard";
import type { Restaurant } from "@/types";

// Mock framer-motion to avoid animation issues in tests
jest.mock("framer-motion", () => ({
  motion: {
    div: React.forwardRef(
      (
        {
          children,
          onDragEnd,
          onKeyDown,
          className,
          tabIndex,
          role,
          "aria-label": ariaLabel,
          "data-testid": testId,
          ...rest
        }: any,
        ref: any
      ) => (
        <div
          ref={ref}
          className={className}
          tabIndex={tabIndex}
          role={role}
          aria-label={ariaLabel}
          data-testid={testId}
          onKeyDown={onKeyDown}
          data-ondragend={onDragEnd ? "true" : undefined}
          {...rest}
        >
          {children}
        </div>
      )
    ),
  },
  useMotionValue: () => ({ get: () => 0, set: () => {} }),
  useTransform: () => ({ get: () => 0 }),
}));

const mockRestaurant: Restaurant = {
  id: "place-123",
  displayName: "Taco Palace",
  rating: 4.5,
  photoReference: "photos/abc123",
};

const mockRestaurantNoPhoto: Restaurant = {
  id: "place-456",
  displayName: "Burger Barn",
  rating: 3.8,
  photoReference: null,
};

describe("RestaurantCard", () => {
  it("renders restaurant name, rating, and photo", () => {
    const onSwipe = jest.fn();
    render(<RestaurantCard restaurant={mockRestaurant} onSwipe={onSwipe} />);

    expect(screen.getByText("Taco Palace")).toBeInTheDocument();
    expect(screen.getByText("⭐ 4.5")).toBeInTheDocument();

    const img = screen.getByAltText("Photo 1 of Taco Palace");
    expect(img).toBeInTheDocument();
    expect(img.tagName).toBe("IMG");
  });

  it("renders placeholder when photo is null", () => {
    const onSwipe = jest.fn();
    render(
      <RestaurantCard restaurant={mockRestaurantNoPhoto} onSwipe={onSwipe} />
    );

    expect(screen.getByText("Burger Barn")).toBeInTheDocument();
    expect(screen.getByTestId("photo-placeholder")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Placeholder image for Burger Barn")
    ).toBeInTheDocument();
  });

  it("✗ button triggers reject swipe", () => {
    const onSwipe = jest.fn();
    render(<RestaurantCard restaurant={mockRestaurant} onSwipe={onSwipe} />);

    fireEvent.click(screen.getByTestId("reject-button"));
    expect(onSwipe).toHaveBeenCalledWith("reject");
  });

  it("✓ button triggers accept swipe", () => {
    const onSwipe = jest.fn();
    render(<RestaurantCard restaurant={mockRestaurant} onSwipe={onSwipe} />);

    fireEvent.click(screen.getByTestId("accept-button"));
    expect(onSwipe).toHaveBeenCalledWith("accept");
  });

  it("buttons are disabled when disabled prop is true", () => {
    const onSwipe = jest.fn();
    render(
      <RestaurantCard
        restaurant={mockRestaurant}
        onSwipe={onSwipe}
        disabled={true}
      />
    );

    fireEvent.click(screen.getByTestId("reject-button"));
    fireEvent.click(screen.getByTestId("accept-button"));
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it("duplicate swipe on same card is ignored when disabled", () => {
    const onSwipe = jest.fn();
    const { rerender } = render(
      <RestaurantCard restaurant={mockRestaurant} onSwipe={onSwipe} />
    );

    fireEvent.click(screen.getByTestId("accept-button"));
    expect(onSwipe).toHaveBeenCalledTimes(1);

    // Re-render as disabled (simulating post-vote state)
    rerender(
      <RestaurantCard
        restaurant={mockRestaurant}
        onSwipe={onSwipe}
        disabled={true}
      />
    );

    fireEvent.click(screen.getByTestId("accept-button"));
    expect(onSwipe).toHaveBeenCalledTimes(1); // Still 1
  });

  it("alt text contains restaurant name", () => {
    const onSwipe = jest.fn();
    render(<RestaurantCard restaurant={mockRestaurant} onSwipe={onSwipe} />);

    const img = screen.getByAltText("Photo 1 of Taco Palace");
    expect(img).toBeInTheDocument();
  });

  it("supports left arrow key for reject", () => {
    const onSwipe = jest.fn();
    render(<RestaurantCard restaurant={mockRestaurant} onSwipe={onSwipe} />);

    const card = screen.getByTestId("restaurant-card");
    fireEvent.keyDown(card, { key: "ArrowLeft" });
    expect(onSwipe).toHaveBeenCalledWith("reject");
  });

  it("supports right arrow key for accept", () => {
    const onSwipe = jest.fn();
    render(<RestaurantCard restaurant={mockRestaurant} onSwipe={onSwipe} />);

    const card = screen.getByTestId("restaurant-card");
    fireEvent.keyDown(card, { key: "ArrowRight" });
    expect(onSwipe).toHaveBeenCalledWith("accept");
  });
});
