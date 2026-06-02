/**
 * @jest-environment jsdom
 */

import { getCurrentLocation } from "@/app/lib/geolocation";

describe("getCurrentLocation", () => {
  const mockGeolocation = {
    getCurrentPosition: jest.fn(),
  };

  beforeEach(() => {
    Object.defineProperty(navigator, "geolocation", {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });
    mockGeolocation.getCurrentPosition.mockReset();
  });

  it("returns coordinates on success", async () => {
    mockGeolocation.getCurrentPosition.mockImplementation(
      (success: PositionCallback) => {
        success({
          coords: { latitude: 54.5973, longitude: -5.9301 },
        } as GeolocationPosition);
      }
    );

    const result = await getCurrentLocation();
    expect(result).toEqual({ success: true, lat: 54.5973, lng: -5.9301 });
  });

  it("returns 'denied' reason on permission denied", async () => {
    mockGeolocation.getCurrentPosition.mockImplementation(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({
          code: 1, // PERMISSION_DENIED
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: "User denied",
        } as GeolocationPositionError);
      }
    );

    const result = await getCurrentLocation();
    expect(result).toEqual({ success: false, reason: "denied" });
  });

  it("returns 'timeout' reason on timeout", async () => {
    mockGeolocation.getCurrentPosition.mockImplementation(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({
          code: 3, // TIMEOUT
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: "Timeout",
        } as GeolocationPositionError);
      }
    );

    const result = await getCurrentLocation();
    expect(result).toEqual({ success: false, reason: "timeout" });
  });

  it("returns 'unavailable' when geolocation API is not present", async () => {
    Object.defineProperty(navigator, "geolocation", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const result = await getCurrentLocation();
    expect(result).toEqual({ success: false, reason: "unavailable" });
  });
});
