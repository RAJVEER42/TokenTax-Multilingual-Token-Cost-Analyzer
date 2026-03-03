/**
 * Auth Store (Zustand) — Phase 10
 *
 * Manages authentication state:
 * - JWT tokens (access + refresh)
 * - User profile
 * - Login/logout transitions
 * - Token persistence via localStorage
 *
 * Design decisions:
 * - Tokens stored in localStorage (not httpOnly cookies) because
 *   this is a SPA making API calls — needs programmatic access
 * - Refresh token rotation handled by the API service layer
 * - Store is synchronous — async auth calls live in hooks
 * - Profile is cached in store to avoid /me calls on every page
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserProfile } from "@/types";

const STORE_VERSION = 1;

interface AuthState {
  /** JWT access token (short-lived). */
  accessToken: string | null;
  /** JWT refresh token (long-lived). */
  refreshToken: string | null;
  /** Cached user profile. */
  user: UserProfile | null;
  /** Whether the user is authenticated. */
  isAuthenticated: boolean;
}

interface AuthActions {
  /** Store tokens after login/register. */
  setTokens: (accessToken: string, refreshToken: string) => void;
  /** Store user profile after /me call. */
  setUser: (user: UserProfile) => void;
  /** Clear all auth state (logout). */
  logout: () => void;
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      ...initialState,

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),

      setUser: (user) => set({ user }),

      logout: () => set(initialState),
    }),
    {
      name: "tokentax-auth",
      version: STORE_VERSION,
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// ── Selectors ──────────────────────────────────────────

export const selectIsAuthenticated = (s: AuthState) => s.isAuthenticated;
export const selectUser = (s: AuthState) => s.user;
export const selectAccessToken = (s: AuthState) => s.accessToken;
