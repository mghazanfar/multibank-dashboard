"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { login as loginRequest } from "@/lib/api/client";
import type { AuthUser } from "@/lib/types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "trading-dashboard-token";
const USER_KEY = "trading-dashboard-user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<{ user: AuthUser | null; token: string | null }>(() => {
    if (typeof window === "undefined") {
      return { user: null, token: null };
    }

    const storedToken = window.localStorage.getItem(TOKEN_KEY);
    const storedUser = window.localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      return {
        token: storedToken,
        user: JSON.parse(storedUser) as AuthUser,
      };
    }

    return { user: null, token: null };
  });

  const login = useCallback(async (username: string, password: string) => {
    const response = await loginRequest(username, password);

    setSession({ token: response.token, user: response.user });

    window.localStorage.setItem(TOKEN_KEY, response.token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(response.user));
  }, []);

  const logout = useCallback(() => {
    setSession({ token: null, user: null });
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  }, []);

  const value = useMemo(
    () => ({
      user: session.user,
      token: session.token,
      login,
      logout,
    }),
    [login, logout, session.token, session.user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
