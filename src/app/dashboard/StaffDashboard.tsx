"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth/AuthProvider";

interface AppRow {
  id: string;
  status: string;
  serviceName: string;
  citizenName: string;
  blockerCount: number;
}

interface DeadlineRow {
  id: string;
  urgency: string;
}

export function StaffDashboard() {
  const { user } = useAuth();
  const { data: appsData } = useQuery({
    queryKey: ["applications", "all"],
    queryFn: () => api.get<{ applications: AppRow[] }>("/api/applications"),
  });
  const { data: deadlinesData } = useQuery({
    queryKey: ["deadlines"],
    queryFn: () => api.get<{ deadlines: DeadlineRow[] }>("/api/deadlines"),
  });

  const applications = appsData?.applications ?? [];
  const deadlines = deadlinesData?.deadlines ?? [];

  const pendingReview = applications.filter((a) => a.status === "UNDER_REVIEW" || a.status === "DOCUMENT_VERIFICATION");
  const blocked = applications.filter((a) => a.blockerCount > 0);
  const overdue = deadlines.filter((d) => d.urgency === "OVERDUE");

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
        <p className="text-sm text-slate-500">{user?.role.replace(/_/g, " ")} workspace</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total applications" value={applications.length} />
        <StatCard label="Pending review" value={pendingReview.length} />
        <StatCard label="Blocked" value={blocked.length} variant="danger" />
        <StatCard label="Overdue deadlines" value={overdue.length} variant="danger" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What needs attention</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {overdue.length > 0 && (
            <AttentionRow label={`${overdue.length} deadline(s) overdue`} severity="HIGH" href="/deadlines" />
          )}
          {blocked.length > 0 && <AttentionRow label={`${blocked.length} application(s) blocked`} severity="HIGH" href="/case-worker" />}
          {pendingReview.length > 0 && (
            <AttentionRow label={`${pendingReview.length} application(s) pending review`} severity="MEDIUM" href="/case-worker" />
          )}
          {overdue.length === 0 && blocked.length === 0 && pendingReview.length === 0 && (
            <p className="text-sm text-slate-500">Nothing needs attention right now.</p>
          )}
        </CardBody>
      </Card>

      <div className="flex gap-3 text-sm">
        <Link href="/case-worker" className="text-indigo-600 hover:underline dark:text-indigo-400">
          Go to case queue →
        </Link>
        <Link href="/analytics" className="text-indigo-600 hover:underline dark:text-indigo-400">
          View analytics →
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, variant }: { label: string; value: number; variant?: "danger" }) {
  return (
    <Card>
      <CardBody>
        <div className={`text-2xl font-bold ${variant === "danger" && value > 0 ? "text-rose-600" : ""}`}>{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </CardBody>
    </Card>
  );
}

function AttentionRow({ label, severity, href }: { label: string; severity: "HIGH" | "MEDIUM" | "LOW"; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800">
      <span>{label}</span>
      <Badge variant={severity === "HIGH" ? "danger" : "warning"}>{severity}</Badge>
    </Link>
  );
}
