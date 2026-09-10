"use client";

import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth/AuthProvider";
import { CitizenDashboard } from "./CitizenDashboard";
import { StaffDashboard } from "./StaffDashboard";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardBody />
    </RequireAuth>
  );
}

function DashboardBody() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === "CITIZEN" ? <CitizenDashboard /> : <StaffDashboard />;
}
