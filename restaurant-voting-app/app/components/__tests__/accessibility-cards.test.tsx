/**
 * @jest-environment jsdom
 */

import React from "react";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { AuthContext } from "@/app/context/AuthContext";
import RestaurantCard from "../RestaurantCard";
import MatchScreen from "../MatchScreen";
import type { Restaurant } from "@/types";

expect.extend(toHaveNoViolations);

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => {
      // Filter out non-DOM props
      const {
        drag, dragConstraints, dragElastic, dragSnapToOrigin,
        onDragEnd, initial, animate, transition, whileHover,
        whileTap, exit, ...domProps
      } = props;
      return <div ref={ref} {...domProps}>{children}</div>;
    }),
    main: React.forwardRef(({ children, ...props }: any, ref: any) => {
      const { initial, animate, transition, ...domProps } = props;
      return <main ref={ref} {...domProps}>{children}</main>;
    }),
  },
  useMotionValue: () => ({ get: () => 0, set: () => {} }),
  useTransform: () => ({ get: () => 0 }),
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockRestaurant: Restaurant = {
  id: "place-123",
  displayName: "Taco Palace",
  rating: 4.5,
  photoReference: "https://example.com/photo.jpg",
};

const mockRestaurantNoPhoto: Restaurant = {
  id: "place-456",
  displayName: "Burger Barn",
  rating: 3.8,
  photoReference: null,
};

function renderWithAuth(ui: React.ReactElement) {
  return render(
    <AuthContext.Provider
      value={{ uid: "test-uid", authError: null, loading: false }}
    >
      {ui}
    </AuthContext.Provider>
  );
}

describe("Accessibility Tests — Card Components (Task 12.1)", () => {
  describe("RestaurantCard with photo", () => {
    it("should have no accessibility violations", async () => {
      const { container } = render(
        <div style={{ position: "relative", width: 300, height: 400 }}>
          <RestaurantCard
            restaurant={mockRestaurant}
            onSwipe={jest.fn()}
          />
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("RestaurantCard with placeholder", () => {
    it("should have no accessibility violations", async () => {
      const { container } = render(
        <div style={{ position: "relative", width: 300, height: 400 }}>
          <RestaurantCard
            restaurant={mockRestaurantNoPhoto}
            onSwipe={jest.fn()}
          />
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("MatchScreen", () => {
    it("should have no accessibility violations", async () => {
      const { container } = renderWithAuth(
        <MatchScreen restaurant={mockRestaurant} hostUid="host-uid" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("MatchScreen with disabled Google Maps button", () => {
    it("should have no accessibility violations", async () => {
      const restaurantNoId: Restaurant = {
        id: "",
        displayName: "No ID Place",
        rating: 4.0,
        photoReference: null,
      };
      const { container } = renderWithAuth(
        <MatchScreen restaurant={restaurantNoId} hostUid="host-uid" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
