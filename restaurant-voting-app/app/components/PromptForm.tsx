"use client";

import React, { useState, useTransition } from "react";
import { validatePrompt } from "@/app/lib/validation";
import { useAuth } from "@/app/context/AuthContext";
import GeolocationButton from "@/app/components/GeolocationButton";
import SearchFilters, {
  DEFAULT_FILTERS,
  type SearchFiltersState,
} from "@/app/components/SearchFilters";

const MAX_CHARS = 500;

export type LocationBias = { lat: number; lng: number };

interface PromptFormProps {
  /**
   * Server Action to call on valid submission.
   * Receives the trimmed prompt string, optional location bias, and filters.
   * Should return an error message string on failure, or null/undefined on success.
   */
  onSubmit?: (
    prompt: string,
    locationBias?: LocationBias,
    filters?: SearchFiltersState
  ) => Promise<string | null | undefined>;
  /** Server action to reverse-geocode coordinates */
  reverseGeocode?: (lat: number, lng: number) => Promise<string>;
}

/**
 * PromptForm renders the natural-language input on the home page.
 *
 * Features:
 * - Textarea with live character counter
 * - Client-side validation via validatePrompt before invoking the Server Action
 * - Inline validation error display (empty prompt, >500 chars)
 * - Inline server error display (AI parser error, session creation error)
 * - Loading state while the Server Action is in flight
 * - Submit button disabled while AuthGate is loading or auth has failed
 */
export default function PromptForm({ onSubmit, reverseGeocode }: PromptFormProps) {
  const { uid, loading: authLoading, authError } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [locationBias, setLocationBias] = useState<LocationBias | null>(null);
  const [filters, setFilters] = useState<SearchFiltersState>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const charCount = prompt.length;
  const isAuthReady = !authLoading && !authError && uid !== null;
  const isSubmitDisabled = !isAuthReady || isPending;

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setPrompt(e.target.value);
    // Clear errors as the user types
    if (validationError) setValidationError(null);
    if (serverError) setServerError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Client-side validation
    const result = validatePrompt(prompt);
    if (!result.valid) {
      setValidationError(result.error ?? "Invalid prompt.");
      return;
    }

    setValidationError(null);
    setServerError(null);

    if (!onSubmit) return;

    startTransition(async () => {
      try {
        const error = await onSubmit(
          prompt.trim(),
          locationBias ?? undefined,
          filters
        );
        if (error) {
          setServerError(error);
        }
      } catch (err) {
        setServerError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again."
        );
      }
    });
  }

  const counterColor =
    charCount > MAX_CHARS
      ? "text-red-600"
      : charCount > MAX_CHARS * 0.9
      ? "text-[#FB8500]"
      : "text-[#023047]/50";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="prompt"
          className="text-sm font-medium text-[#023047]"
        >
          Describe your group&apos;s dining preferences
        </label>

        {reverseGeocode && (
          <GeolocationButton
            onLocationChange={(loc) =>
              setLocationBias(loc ? { lat: loc.lat, lng: loc.lng } : null)
            }
            reverseGeocode={reverseGeocode}
          />
        )}

        {/* Filters toggle */}
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
          className="self-start text-sm font-medium text-[#219EBC] hover:text-[#023047] transition-colors"
        >
          {showFilters ? "Hide filters ▲" : "Filters ▼"}
        </button>

        {showFilters && (
          <div className="rounded-xl border border-[#8ECAE6]/30 bg-[#8ECAE6]/5 p-3">
            <SearchFilters filters={filters} onChange={setFilters} />
          </div>
        )}

        <div className="relative">
          <textarea
            id="prompt"
            name="prompt"
            value={prompt}
            onChange={handleChange}
            placeholder="e.g. 4 friends, Mexican food, medium budget, downtown area"
            rows={4}
            aria-describedby={
              validationError
                ? "prompt-validation-error"
                : serverError
                ? "prompt-server-error"
                : "prompt-counter"
            }
            aria-invalid={!!(validationError || serverError)}
            disabled={isPending}
            className={[
              "w-full resize-none rounded-xl border px-4 py-3 text-base text-[#023047] placeholder:text-[#023047]/40",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#219EBC] focus-visible:ring-offset-1",
              "disabled:cursor-not-allowed disabled:opacity-50",
              validationError || serverError
                ? "border-red-400 bg-red-50"
                : "border-[#8ECAE6] bg-white",
            ].join(" ")}
          />
          <span
            id="prompt-counter"
            aria-live="polite"
            className={`absolute bottom-2.5 right-3 text-xs tabular-nums ${counterColor}`}
          >
            {charCount}/{MAX_CHARS}
          </span>
        </div>

        {validationError && (
          <p
            id="prompt-validation-error"
            role="alert"
            className="text-sm text-red-600"
          >
            {validationError}
          </p>
        )}

        {serverError && (
          <p
            id="prompt-server-error"
            role="alert"
            className="text-sm text-red-600"
          >
            {serverError}
          </p>
        )}

        {authError && (
          <p className="text-sm text-red-600">
            Authentication failed. Please refresh the page to retry.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitDisabled}
        aria-busy={isPending}
        className={[
          "flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-colors min-h-[44px]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB703]",
          isSubmitDisabled
            ? "cursor-not-allowed bg-[#8ECAE6]/40 text-[#023047]/40"
            : "bg-[#FFB703] text-[#023047] hover:bg-[#FB8500] active:bg-[#FB8500]",
        ].join(" ")}
      >
        {isPending ? (
          <>
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#023047] border-t-transparent"
              aria-hidden="true"
            />
            Finding restaurants…
          </>
        ) : (
          "Find Restaurants"
        )}
      </button>
    </form>
  );
}
