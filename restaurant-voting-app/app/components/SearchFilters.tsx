"use client";

import React from "react";

export type PriceLevel = "$" | "$$" | "$$$" | "$$$$";
export type DietaryOption = "vegetarian" | "vegan" | "halal" | "gluten-free";

export interface SearchFiltersState {
  showClosed: boolean;
  priceLevels: PriceLevel[];
  dietary: DietaryOption[];
  radiusKm: number;
}

export const DEFAULT_FILTERS: SearchFiltersState = {
  showClosed: false,
  priceLevels: [],
  dietary: [],
  radiusKm: 5,
};

interface SearchFiltersProps {
  filters: SearchFiltersState;
  onChange: (filters: SearchFiltersState) => void;
}

const PRICE_OPTIONS: PriceLevel[] = ["$", "$$", "$$$", "$$$$"];
const DIETARY_OPTIONS: DietaryOption[] = ["vegetarian", "vegan", "halal", "gluten-free"];

/**
 * SearchFilters — toggleable filter panel for restaurant search.
 * Allows users to set search radius, price range, dietary preferences,
 * and whether to include closed places.
 */
export default function SearchFilters({ filters, onChange }: SearchFiltersProps) {
  function togglePrice(level: PriceLevel) {
    const next = filters.priceLevels.includes(level)
      ? filters.priceLevels.filter((p) => p !== level)
      : [...filters.priceLevels, level];
    onChange({ ...filters, priceLevels: next });
  }

  function toggleDietary(option: DietaryOption) {
    const next = filters.dietary.includes(option)
      ? filters.dietary.filter((d) => d !== option)
      : [...filters.dietary, option];
    onChange({ ...filters, dietary: next });
  }

  function toggleShowClosed() {
    onChange({ ...filters, showClosed: !filters.showClosed });
  }

  function handleRadiusChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ ...filters, radiusKm: Number(e.target.value) });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search radius */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium text-[#023047]/70">Search radius</p>
          <span className="text-xs font-semibold text-[#219EBC]">{filters.radiusKm} km</span>
        </div>
        <input
          type="range"
          min={1}
          max={25}
          step={1}
          value={filters.radiusKm}
          onChange={handleRadiusChange}
          aria-label={`Search radius: ${filters.radiusKm} kilometers`}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[#8ECAE6]/30 accent-[#219EBC]"
        />
        <div className="flex justify-between text-[10px] text-[#023047]/40 mt-0.5">
          <span>1 km</span>
          <span>25 km</span>
        </div>
      </div>

      {/* Price range */}
      <div>
        <p className="text-xs font-medium text-[#023047]/70 mb-1.5">Price range</p>
        <div className="flex gap-2">
          {PRICE_OPTIONS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => togglePrice(level)}
              aria-pressed={filters.priceLevels.includes(level)}
              className={[
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors min-h-[36px]",
                filters.priceLevels.includes(level)
                  ? "bg-[#219EBC] text-white"
                  : "bg-[#8ECAE6]/20 text-[#023047]/70 hover:bg-[#8ECAE6]/40",
              ].join(" ")}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Dietary options */}
      <div>
        <p className="text-xs font-medium text-[#023047]/70 mb-1.5">Dietary</p>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => toggleDietary(option)}
              aria-pressed={filters.dietary.includes(option)}
              className={[
                "rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors min-h-[36px]",
                filters.dietary.includes(option)
                  ? "bg-[#219EBC] text-white"
                  : "bg-[#8ECAE6]/20 text-[#023047]/70 hover:bg-[#8ECAE6]/40",
              ].join(" ")}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Show closed toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.showClosed}
          onChange={toggleShowClosed}
          className="h-4 w-4 rounded border-[#8ECAE6] text-[#219EBC] focus:ring-[#219EBC]"
        />
        <span className="text-sm text-[#023047]/70">Include closed restaurants</span>
      </label>
    </div>
  );
}
