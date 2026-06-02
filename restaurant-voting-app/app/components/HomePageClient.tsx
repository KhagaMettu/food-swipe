"use client";

import { useRouter } from "next/navigation";
import PromptForm from "@/app/components/PromptForm";
import { useAuth } from "@/app/context/AuthContext";
import { createSession } from "@/app/actions/session";
import { reverseGeocode } from "@/app/actions/geocode";
import type { LocationBias } from "@/app/components/PromptForm";
import type { SearchFiltersState } from "@/app/components/SearchFilters";

/**
 * Client-side wrapper for the home page.
 * Handles form submission and routing.
 */
export default function HomePageClient() {
  const router = useRouter();
  const { uid } = useAuth();

  async function handleSubmit(
    prompt: string,
    locationBias?: LocationBias,
    filters?: SearchFiltersState
  ): Promise<string | null> {
    if (!uid) {
      return "You must be signed in to create a session.";
    }

    performance.mark("createSession:start");
    const result = await createSession(prompt, uid, locationBias, filters);
    performance.mark("createSession:end");
    performance.measure("createSession", "createSession:start", "createSession:end");

    if (result.success) {
      router.push(result.shareUrl);
      return null;
    }

    return result.error;
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center min-h-screen px-4 py-16" style={{ background: "linear-gradient(135deg, #8ECAE6 0%, #219EBC 100%)" }}>
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#023047]">
            🍽️ Where should we eat?
          </h1>
          <p className="mt-2 text-[#023047]/70 text-sm">
            Describe your group&apos;s preferences and we&apos;ll find the
            perfect restaurants to vote on.
          </p>
        </div>

        <div className="rounded-2xl bg-white/90 backdrop-blur-sm shadow-xl p-6">
          <PromptForm onSubmit={handleSubmit} reverseGeocode={reverseGeocode} />
        </div>
      </div>
    </main>
  );
}
