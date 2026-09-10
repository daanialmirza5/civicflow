"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { statusLabel, formatDate } from "@/lib/utils";

interface Match {
  serviceId: string;
  serviceName: string;
  category: string;
  verdict: "MATCH" | "NOT_MATCH" | "INCOMPLETE";
  completeness: number;
  satisfiedCount: number;
  totalConditions: number;
}

interface AppRow {
  id: string;
  status: string;
  serviceName: string;
  blockerCount: number;
  blockers: { reason: string; requiredAction: string; owner: string }[];
  updatedAt: string;
}

interface DeadlineRow {
  id: string;
  label: string;
  dueAt: string;
  urgency: "OVERDUE" | "DUE_SOON" | "UPCOMING" | "COMPLETED";
  priority: "HIGH" | "MEDIUM" | "LOW";
  applicationId: string | null;
}

export function CitizenDashboard() {
  const { data: discovery } = useQuery({
    queryKey: ["discovery"],
    queryFn: () => api.get<{ matches: Match[] }>("/api/discovery"),
  });
  const { data: appsData } = useQuery({
    queryKey: ["applications", "mine"],
    queryFn: () => api.get<{ applications: AppRow[] }>("/api/applications"),
  });
  const { data: deadlinesData } = useQuery({
    queryKey: ["deadlines"],
    queryFn: () => api.get<{ deadlines: DeadlineRow[] }>("/api/deadlines"),
  });

  const applications = appsData?.applications ?? [];
  const matches = discovery?.matches ?? [];
  const deadlines = deadlinesData?.deadlines ?? [];

  const nextActions = applications
    .filter((a) => a.blockerCount > 0 && a.blockers.some((b) => b.owner === "CITIZEN"))
    .flatMap((a) => a.blockers.filter((b) => b.owner === "CITIZEN").map((b) => ({ app: a, blocker: b })))
    .slice(0, 5);

  const urgentDeadlines = deadlines.filter((d) => d.urgency === "OVERDUE" || d.urgency === "DUE_SOON");

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-slate-500">Here is what needs your attention today.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next best action</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {nextActions.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing is currently blocking your applications. Explore services to find new matches.</p>
          ) : (
            nextActions.map(({ app, blocker }, i) => (
              <div key={`${app.id}-${i}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <div>
                  <div className="text-sm font-medium">{blocker.requiredAction}</div>
                  <div className="text-xs text-slate-500">
                    Why: {blocker.reason} — {app.serviceName}
                  </div>
                </div>
                <Link href={`/applications/${app.id}`}>
                  <Button size="sm">Take action</Button>
                </Link>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Potential service matches</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {matches.slice(0, 5).map((m) => (
              <Link
                key={m.serviceId}
                href={`/services/${m.serviceId}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
              >
                <div>
                  <div className="font-medium">{m.serviceName}</div>
                  <div className="text-xs text-slate-500">
                    {m.satisfiedCount}/{m.totalConditions} known conditions satisfied
                  </div>
                </div>
                <VerdictBadge verdict={m.verdict} />
              </Link>
            ))}
            <Link href="/services" className="block pt-1 text-sm text-indigo-600 hover:underline dark:text-indigo-400">
              View all services →
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming deadlines</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {urgentDeadlines.length === 0 ? (
              <p className="text-sm text-slate-500">No urgent deadlines.</p>
            ) : (
              urgentDeadlines.slice(0, 5).map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                  <div>
                    <div className="font-medium">{d.label}</div>
                    <div className="text-xs text-slate-500">Due {formatDate(d.dueAt)}</div>
                  </div>
                  <Badge variant={d.urgency === "OVERDUE" ? "danger" : "warning"}>{d.urgency.replace("_", " ")}</Badge>
                </div>
              ))
            )}
            <Link href="/deadlines" className="block pt-1 text-sm text-indigo-600 hover:underline dark:text-indigo-400">
              View deadline center →
            </Link>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My applications</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {applications.length === 0 ? (
            <p className="text-sm text-slate-500">You have not started any applications yet.</p>
          ) : (
            applications.slice(0, 6).map((a) => (
              <Link
                key={a.id}
                href={`/applications/${a.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
              >
                <div>
                  <div className="font-medium">{a.serviceName}</div>
                  <div className="text-xs text-slate-500">{statusLabel(a.status)}</div>
                </div>
                {a.blockerCount > 0 ? <Badge variant="danger">Blocked</Badge> : <Badge variant="neutral">{statusLabel(a.status)}</Badge>}
              </Link>
            ))
          )}
          <Link href="/applications" className="block pt-1 text-sm text-indigo-600 hover:underline dark:text-indigo-400">
            View all applications →
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: Match["verdict"] }) {
  if (verdict === "MATCH") return <Badge variant="success">Match</Badge>;
  if (verdict === "INCOMPLETE") return <Badge variant="warning">Incomplete</Badge>;
  return <Badge variant="neutral">Not matched</Badge>;
}
