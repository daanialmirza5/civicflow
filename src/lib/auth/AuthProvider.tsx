"use client";

import { createContext, useCallback, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "CITIZEN" | "CASE_WORKER" | "SERVICE_ADMIN" | "SYSTEM_ADMIN";
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ME_KEY = ["auth", "me"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ME_KEY,
    queryFn: () => api.get<{ user: AuthUser | null }>("/api/auth/me"),
    staleTime: 60_000,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ME_KEY });
  }, [queryClient]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { user } = await api.post<{ user: AuthUser }>("/api/auth/login", { email, password });
      queryClient.setQueryData(ME_KEY, { user });
    },
    [queryClient]
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const { user } = await api.post<{ user: AuthUser }>("/api/auth/register", { email, password, name });
      queryClient.setQueryData(ME_KEY, { user });
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout");
    queryClient.setQueryData(ME_KEY, { user: null });
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user: data?.user ?? null, loading: isLoading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
