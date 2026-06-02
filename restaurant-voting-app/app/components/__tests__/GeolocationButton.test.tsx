/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GeolocationButton from "../GeolocationButton";

// Mock the geolocation utility
jest.mock("@/app/lib/geolocation", () => ({
  getCurrentLocation: jest.fn(),
}));

import { getCurrentLocation } from "@/app/lib/geolocation";
const mockGetCurrentLocation = getCurrentLocation as jest.MockedFunction<typeof getCurrentLocation>;

describe("GeolocationButton", () => {
  const mockOnLocationChange = jest.fn();
  const mockReverseGeocode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockReverseGeocode.mockResolvedValue("Belfast, UK");
  });

  it("renders 'Use my location' button", () => {
    render(
      <GeolocationButton
        onLocationChange={mockOnLocationChange}
        reverseGeocode={mockReverseGeocode}
      />
    );

    expect(screen.getByRole("button", { name: /use my location/i })).toBeInTheDocument();
  });

  it("displays location indicator on successful geolocation", async () => {
    mockGetCurrentLocation.mockResolvedValue({ success: true, lat: 54.59, lng: -5.93 });

    render(
      <GeolocationButton
        onLocationChange={mockOnLocationChange}
        reverseGeocode={mockReverseGeocode}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));

    await waitFor(() => {
      expect(screen.getByText(/Belfast, UK detected/)).toBeInTheDocument();
    });

    expect(mockOnLocationChange).toHaveBeenCalledWith({
      lat: 54.59,
      lng: -5.93,
      locationName: "Belfast, UK",
    });
  });

  it("clears location when dismiss button is clicked", async () => {
    mockGetCurrentLocation.mockResolvedValue({ success: true, lat: 54.59, lng: -5.93 });

    render(
      <GeolocationButton
        onLocationChange={mockOnLocationChange}
        reverseGeocode={mockReverseGeocode}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));

    await waitFor(() => {
      expect(screen.getByText(/Belfast, UK detected/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /clear detected location/i }));

    expect(mockOnLocationChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole("button", { name: /use my location/i })).toBeInTheDocument();
  });

  it("shows error message on permission denial", async () => {
    mockGetCurrentLocation.mockResolvedValue({ success: false, reason: "denied" });

    render(
      <GeolocationButton
        onLocationChange={mockOnLocationChange}
        reverseGeocode={mockReverseGeocode}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/location access denied/i);
    });
  });

  it("silently resolves on timeout with no UI change", async () => {
    mockGetCurrentLocation.mockResolvedValue({ success: false, reason: "timeout" });

    render(
      <GeolocationButton
        onLocationChange={mockOnLocationChange}
        reverseGeocode={mockReverseGeocode}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /use my location/i })).not.toBeDisabled();
    });

    // No error message, no location indicator
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/detected/)).not.toBeInTheDocument();
    expect(mockOnLocationChange).not.toHaveBeenCalled();
  });
});
