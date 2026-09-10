"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, AuthUser } from "@/lib/auth/AuthProvider";

export function RequireAuth({ roles, children }: { roles?: AuthUser["role"][]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [loading, user, roles, router]);

  if (loading || !user || (roles && !roles.includes(user.role))) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-slate-500">Loading...</div>;
  }

  return <>{children}</>;
}
