"use client";

import React, { useEffect, useState, useCallback } from "react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/app/lib/firebase";
import { AuthContext } from "@/app/context/AuthContext";
import { reportError } from "@/app/lib/analytics";

interface AuthGateProps {
  children: React.ReactNode;
}

/**
 * AuthGate wraps the entire app and ensures every page has an anonymous Firebase
 * Auth session before rendering children.
 *
 * Behaviour:
 * - On mount, checks for an existing auth token via onAuthStateChanged.
 * - If no user is signed in, calls signInAnonymously().
 * - Renders children only after auth succeeds.
 * - Renders a full-page error with a retry button on failure.
 * - Exposes { uid, authError, loading } via AuthContext.
 */
export default function AuthGate({ children }: AuthGateProps) {
  const [uid, setUid] = useState<string | null>(null);
  const [authError, setAuthError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const initAuth = useCallback(() => {
    setAuthError(null);
    setLoading(true);

    let didUnsubscribe = false;
    let unsubscribeFn: (() => void) | null = null;

    const safeUnsubscribe = () => {
      didUnsubscribe = true;
      if (unsubscribeFn) unsubscribeFn();
    };

    // onAuthStateChanged fires immediately with the current user (or null).
    // This lets us reuse an existing token without calling signInAnonymously again.
    unsubscribeFn = onAuthStateChanged(
      auth,
      async (user) => {
        if (user) {
          // Existing session — reuse it.
          setUid(user.uid);
          setLoading(false);
          safeUnsubscribe();
        } else {
          // No session — sign in anonymously.
          try {
            const credential = await signInAnonymously(auth);
            setUid(credential.user.uid);
            setLoading(false);
          } catch (err) {
            const error = err instanceof Error ? err : new Error("Authentication failed.");
            reportError(error, { component: "AuthGate", action: "signInAnonymously" });
            setAuthError(error);
            setLoading(false);
          }
          safeUnsubscribe();
        }
      },
      (err) => {
        reportError(err, { component: "AuthGate", action: "onAuthStateChanged" });
        setAuthError(err);
        setLoading(false);
        safeUnsubscribe();
      }
    );

    // If the callback already fired synchronously, unsubscribe now
    if (didUnsubscribe && unsubscribeFn) {
      unsubscribeFn();
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initAuth();
  }, [initAuth]);

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center" style={{ background: "linear-gradient(135deg, #8ECAE6 0%, #219EBC 100%)" }}
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex flex-col items-center gap-3">
          <span
            className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#8ECAE6] border-t-[#023047]"
            aria-hidden="true"
          />
          <p className="text-[#023047] text-sm font-medium">Signing in…</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 px-4" style={{ background: "linear-gradient(135deg, #8ECAE6 0%, #219EBC 100%)" }}
        role="alert"
      >
        <div className="rounded-2xl bg-white/90 backdrop-blur-sm shadow-xl p-8 max-w-sm w-full text-center">
          <h1 className="text-xl font-semibold text-[#023047]">
            Authentication failed
          </h1>
          <p className="mt-2 text-[#023047]/70 text-sm">
            We couldn&apos;t sign you in. Please check your connection and try
            again.
          </p>
          <p className="mt-2 text-sm text-red-600">{authError.message}</p>
          <button
            onClick={initAuth}
            className="mt-4 rounded-xl bg-[#FFB703] px-5 py-2.5 text-sm font-semibold text-[#023047] hover:bg-[#FB8500] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB703]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ uid, authError, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
