"use client";

import { useState } from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { api, ApiError } from "@/lib/api/client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { WhatIfExplorer } from "./WhatIfExplorer";

interface RequirementRow {
  id: string;
  type: string;
  necessity: string;
  name: string;
  description: string;
}
interface ServiceDetail {
  id: string;
  name: string;
  description: string;
  category: string;
  jurisdiction: string;
  isSynthetic: boolean;
  department: { id: string; name: string };
  requirements: RequirementRow[];
}
interface ConditionResult {
  label: string;
  outcome: "SATISFIED" | "NOT_SATISFIED" | "MISSING_INFORMATION";
}
interface EligibilityResponse {
  result: {
    verdict: "MATCH" | "NOT_MATCH" | "INCOMPLETE";
    completeness: number;
    conditions: ConditionResult[];
    missingFields: string[];
  };
}

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <ServiceDetailBody id={id} />
    </RequireAuth>
  );
}

function ServiceDetailBody({ id }: { id: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["service", id],
    queryFn: () => api.get<{ service: ServiceDetail }>(`/api/services/${id}`),
  });

  const { data: eligibility } = useQuery({
    queryKey: ["eligibility", id],
    queryFn: () => api.post<EligibilityResponse>(`/api/services/${id}/eligibility`, {}),
    enabled: user?.role === "CITIZEN",
  });

  const createApplication = useMutation({
    mutationFn: () => api.post<{ application: { id: string } }>("/api/applications", { serviceId: id }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      router.push(`/applications/${res.application.id}`);
    },
    onError: (err) => setCreateError(err instanceof ApiError ? err.message : "Could not create application."),
  });

  const service = data?.service;
  if (!service) return <div className="mx-auto max-w-4xl px-4 py-16 text-sm text-slate-500">Loading...</div>;

  const result = eligibility?.result;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>{service.department.name}</span>
          <span>·</span>
          <span>{service.category.replace(/_/g, " ")}</span>
          <Badge variant="neutral">Synthetic demo service</Badge>
        </div>
        <h1 className="text-2xl font-bold">{service.name}</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">{service.description}</p>
        <Link href={`/graph/${service.id}`} className="mt-2 inline-block text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          View service graph →
        </Link>
      </div>

      {user?.role === "CITIZEN" && result && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Your eligibility</CardTitle>
            <VerdictBadge verdict={result.verdict} />
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {result.verdict === "MATCH" && "Based on the information provided, you appear to satisfy the demo eligibility rules."}
              {result.verdict === "NOT_MATCH" && "Based on the information provided, one or more demo eligibility rules are not satisfied."}
              {result.verdict === "INCOMPLETE" &&
                `Eligibility profile ${result.completeness}% complete. Provide the missing information below for a full result.`}
            </p>
            <ul className="space-y-1.5">
              {result.conditions.map((c, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <ConditionIcon outcome={c.outcome} />
                  <span className={c.outcome === "NOT_SATISFIED" ? "text-rose-700 dark:text-rose-400" : ""}>{c.label}</span>
                </li>
              ))}
            </ul>
            {result.missingFields.length > 0 && (
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                Missing information: {result.missingFields.join(", ")}.{" "}
                <Link href="/profile" className="underline">
                  Update your profile
                </Link>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {user?.role === "CITIZEN" && <WhatIfExplorer serviceId={id} />}

      <Card>
        <CardHeader>
          <CardTitle>Required documents</CardTitle>
        </CardHeader>
        <CardBody>
          <ul className="space-y-2">
            {service.requirements.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-slate-500">{r.description}</div>
                </div>
                <Badge variant={r.necessity === "REQUIRED" ? "warning" : "neutral"}>{r.necessity}</Badge>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {user?.role === "CITIZEN" && (
        <div className="flex items-center gap-3">
          <Button
            disabled={creating || createApplication.isPending}
            onClick={() => {
              setCreating(true);
              createApplication.mutate();
            }}
          >
            {createApplication.isPending ? "Creating..." : "Start application"}
          </Button>
          {createError && <span className="text-sm text-rose-600">{createError}</span>}
        </div>
      )}
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: "MATCH" | "NOT_MATCH" | "INCOMPLETE" }) {
  if (verdict === "MATCH") return <Badge variant="success">Potential match</Badge>;
  if (verdict === "INCOMPLETE") return <Badge variant="warning">Incomplete profile</Badge>;
  return <Badge variant="neutral">Not matched</Badge>;
}

function ConditionIcon({ outcome }: { outcome: ConditionResult["outcome"] }) {
  if (outcome === "SATISFIED") return <span className="text-emerald-600">✓</span>;
  if (outcome === "NOT_SATISFIED") return <span className="text-rose-600">✗</span>;
  return <span className="text-amber-600">?</span>;
}
