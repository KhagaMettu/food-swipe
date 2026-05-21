import { buildGoogleMapsDeepLink, buildUberEatsDeepLink } from "../deep-links";
import type { Restaurant } from "@/types";

const baseRestaurant: Restaurant = {
  id: "ChIJN1t_tDeuEmsRUsoyG83frY4",
  displayName: "The Burger Joint",
  rating: 4.5,
  photoReference: null,
};

describe("buildGoogleMapsDeepLink", () => {
  it("returns a non-null URL for a restaurant with a valid id", () => {
    const url = buildGoogleMapsDeepLink(baseRestaurant);
    expect(url).not.toBeNull();
    expect(typeof url).toBe("string");
  });

  it("URL contains the place ID", () => {
    const url = buildGoogleMapsDeepLink(baseRestaurant)!;
    expect(url).toContain(encodeURIComponent(baseRestaurant.id));
  });

  it("URL contains the display name", () => {
    const url = buildGoogleMapsDeepLink(baseRestaurant)!;
    expect(url).toContain(encodeURIComponent(baseRestaurant.displayName));
  });

  it("returns null when restaurant.id is an empty string (falsy)", () => {
    const restaurant: Restaurant = { ...baseRestaurant, id: "" };
    expect(buildGoogleMapsDeepLink(restaurant)).toBeNull();
  });
});

describe("buildUberEatsDeepLink", () => {
  it("returns a string URL", () => {
    const url = buildUberEatsDeepLink(baseRestaurant);
    expect(typeof url).toBe("string");
    expect(url.length).toBeGreaterThan(0);
  });

  it("URL contains the URL-encoded displayName as the search query", () => {
    const url = buildUberEatsDeepLink(baseRestaurant);
    expect(url).toContain(encodeURIComponent(baseRestaurant.displayName));
  });

  it("encodes special characters in the display name", () => {
    const restaurant: Restaurant = {
      ...baseRestaurant,
      displayName: "Café & Bistro (Downtown)",
    };
    const url = buildUberEatsDeepLink(restaurant);
    expect(url).toContain(encodeURIComponent("Café & Bistro (Downtown)"));
  });

  it("encodes spaces in the display name", () => {
    const restaurant: Restaurant = {
      ...baseRestaurant,
      displayName: "Pizza Palace",
    };
    const url = buildUberEatsDeepLink(restaurant);
    // encodeURIComponent encodes spaces as %20
    expect(url).toContain("Pizza%20Palace");
  });
});
