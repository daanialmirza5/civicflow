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
  citizenName: string;
  updatedAt: string;
  blockerCount: number;
  blockers: { owner: string; reason: string }[];
}

type Filter = "ALL" | "PENDING_REVIEW" | "BLOCKED" | "AWAITING_CITIZEN";

export default function CaseWorkerPage() {
  return (
    <RequireAuth roles={["CASE_WORKER", "SERVICE_ADMIN", "SYSTEM_ADMIN"]}>
      <CaseWorkerBody />
    </RequireAuth>
  );
}

function CaseWorkerBody() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const { data } = useQuery({
    queryKey: ["applications", "queue"],
    queryFn: () => api.get<{ applications: AppRow[] }>("/api/applications"),
  });

  const applications = data?.applications ?? [];

  const filtered = applications.filter((a) => {
    if (filter === "ALL") return true;
    if (filter === "PENDING_REVIEW") return a.status === "UNDER_REVIEW" || a.status === "DOCUMENT_VERIFICATION";
    if (filter === "BLOCKED") return a.blockerCount > 0;
    if (filter === "AWAITING_CITIZEN") return a.blockers.some((b) => b.owner === "CITIZEN");
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">Case queue</h1>
        <p className="text-sm text-slate-500">All applications across the platform.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["ALL", "PENDING_REVIEW", "BLOCKED", "AWAITING_CITIZEN"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              filter === f
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {f.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((a) => (
          <Link key={a.id} href={`/applications/${a.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardBody className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {a.serviceName} — {a.citizenName}
                  </div>
                  <div className="text-xs text-slate-500">Updated {formatDate(a.updatedAt)}</div>
                  {a.blockerCount > 0 && <div className="text-xs text-rose-600">{a.blockers[0]?.reason}</div>}
                </div>
                <div className="flex items-center gap-2">
                  {a.blockerCount > 0 && <Badge variant="danger">Blocked</Badge>}
                  <Badge variant="neutral">{statusLabel(a.status)}</Badge>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && <p className="text-sm text-slate-500">No applications match this filter.</p>}
      </div>
    </div>
  );
}
