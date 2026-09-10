"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api/client";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { statusLabel, formatDate } from "@/lib/utils";

interface AppRow {
  id: string;
  status: string;
  serviceName: string;
  blockerCount: number;
  updatedAt: string;
}

const STATUSES = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "DOCUMENT_VERIFICATION", "ADDITIONAL_INFORMATION_REQUIRED", "RESUBMITTED", "APPROVED", "REJECTED", "CANCELLED"];

export default function ApplicationsPage() {
  return (
    <RequireAuth roles={["CITIZEN"]}>
      <ApplicationsBody />
    </RequireAuth>
  );
}

function ApplicationsBody() {
  const [status, setStatus] = useState("");
  const { data } = useQuery({
    queryKey: ["applications", "mine", status],
    queryFn: () => api.get<{ applications: AppRow[] }>(`/api/applications${status ? `?status=${status}` : ""}`),
  });

  const applications = data?.applications ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My applications</h1>
          <p className="text-sm text-slate-500">Track progress, blockers, and next actions for each application.</p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {applications.length === 0 && <p className="text-sm text-slate-500">No applications found.</p>}
        {applications.map((a) => (
          <Link key={a.id} href={`/applications/${a.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardBody className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{a.serviceName}</div>
                  <div className="text-xs text-slate-500">Updated {formatDate(a.updatedAt)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {a.blockerCount > 0 && <Badge variant="danger">Blocked</Badge>}
                  <Badge variant="neutral">{statusLabel(a.status)}</Badge>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
