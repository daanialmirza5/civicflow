"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api/client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

interface DeadlineRow {
  id: string;
  kind: string;
  label: string;
  dueAt: string;
  urgency: "OVERDUE" | "DUE_SOON" | "UPCOMING" | "COMPLETED";
  priority: "HIGH" | "MEDIUM" | "LOW";
  serviceName: string | null;
  applicationId: string | null;
}

const GROUPS: { key: DeadlineRow["urgency"]; title: string }[] = [
  { key: "OVERDUE", title: "Overdue" },
  { key: "DUE_SOON", title: "Due soon (within 7 days)" },
  { key: "UPCOMING", title: "Upcoming" },
  { key: "COMPLETED", title: "Completed" },
];

export default function DeadlinesPage() {
  return (
    <RequireAuth>
      <DeadlinesBody />
    </RequireAuth>
  );
}

function DeadlinesBody() {
  const { data } = useQuery({
    queryKey: ["deadlines", "full"],
    queryFn: () => api.get<{ deadlines: DeadlineRow[] }>("/api/deadlines"),
  });
  const deadlines = data?.deadlines ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">Deadline center</h1>
        <p className="text-sm text-slate-500">Real dates from the demo dataset — never fabricated.</p>
      </div>

      {GROUPS.map((group) => {
        const rows = deadlines.filter((d) => d.urgency === group.key);
        if (rows.length === 0) return null;
        return (
          <Card key={group.key}>
            <CardHeader>
              <CardTitle>
                {group.title} ({rows.length})
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {rows.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                  <div>
                    <div className="font-medium">{d.label}</div>
                    <div className="text-xs text-slate-500">
                      {d.serviceName} · Due {formatDate(d.dueAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={d.priority === "HIGH" ? "danger" : d.priority === "MEDIUM" ? "warning" : "neutral"}>{d.priority}</Badge>
                    {d.applicationId && (
                      <Link href={`/applications/${d.applicationId}`} className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">
                        View
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        );
      })}
      {deadlines.length === 0 && <p className="text-sm text-slate-500">No deadlines found.</p>}
    </div>
  );
}
