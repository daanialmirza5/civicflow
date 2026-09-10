"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api/client";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth/AuthProvider";

interface ServiceRow {
  id: string;
  name: string;
  description: string;
  category: string;
  department: string;
  requirementCount: number;
  isSynthetic: boolean;
}

interface Match {
  serviceId: string;
  verdict: "MATCH" | "NOT_MATCH" | "INCOMPLETE";
  completeness: number;
  satisfiedCount: number;
  totalConditions: number;
  missingFields: string[];
}

const CATEGORIES = [
  "EDUCATION",
  "HEALTHCARE",
  "EMPLOYMENT",
  "HOUSING",
  "AGRICULTURE",
  "SMALL_BUSINESS",
  "SOCIAL_SUPPORT",
  "DISABILITY_SUPPORT",
  "PUBLIC_UTILITIES",
  "IDENTITY_DOCUMENTATION",
];

export default function ServicesPage() {
  return (
    <RequireAuth>
      <ServicesBody />
    </RequireAuth>
  );
}

function ServicesBody() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const { data } = useQuery({
    queryKey: ["services", query, category],
    queryFn: () =>
      api.get<{ services: ServiceRow[] }>(`/api/services?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(category ? { category } : {}) })}`),
  });

  const { data: discovery } = useQuery({
    queryKey: ["discovery"],
    queryFn: () => api.get<{ matches: Match[] }>("/api/discovery"),
    enabled: user?.role === "CITIZEN",
  });

  const matchById = useMemo(() => {
    const map = new Map<string, Match>();
    for (const m of discovery?.matches ?? []) map.set(m.serviceId, m);
    return map;
  }, [discovery]);

  const services = data?.services ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">Service catalog</h1>
        <p className="text-sm text-slate-500">Synthetic demonstration services. Rankings reflect known-condition matches, not approval probability.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          placeholder="Search services..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {services.map((s) => {
          const match = matchById.get(s.id);
          return (
            <Link key={s.id} href={`/services/${s.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardBody>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{s.name}</div>
                      <div className="text-xs text-slate-500">
                        {s.department} · {s.category.replace(/_/g, " ")}
                      </div>
                    </div>
                    {match && <MatchBadge match={match} />}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{s.description}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Badge variant="neutral">Synthetic demo</Badge>
                    <span>{s.requirementCount} requirements</span>
                  </div>
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MatchBadge({ match }: { match: Match }) {
  if (match.verdict === "MATCH") return <Badge variant="success">{match.satisfiedCount}/{match.totalConditions} satisfied</Badge>;
  if (match.verdict === "INCOMPLETE") return <Badge variant="warning">Info needed</Badge>;
  return <Badge variant="neutral">Not matched</Badge>;
}
