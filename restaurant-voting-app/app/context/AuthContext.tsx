"use client";

import { createContext, useContext } from "react";

export interface AuthContextValue {
  uid: string | null;
  authError: Error | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  uid: null,
  authError: null,
  loading: true,
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
