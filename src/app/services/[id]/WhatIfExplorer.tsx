"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface EligibilityResponse {
  result: {
    verdict: "MATCH" | "NOT_MATCH" | "INCOMPLETE";
    satisfiedCount: number;
    totalConditions: number;
  };
}

// "What changes if my situation changes?" — recomputes eligibility against a
// temporary override, never touching the citizen's saved profile (build brief §50).
export function WhatIfExplorer({ serviceId }: { serviceId: string }) {
  const [income, setIncome] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");

  const mutation = useMutation({
    mutationFn: (overrides: Record<string, string | number>) =>
      api.post<EligibilityResponse>(`/api/services/${serviceId}/eligibility`, { overrides }),
  });

  function recalculate() {
    const overrides: Record<string, string | number> = {};
    if (income.trim() !== "") overrides.annualIncome = Number(income);
    if (employmentStatus.trim() !== "") overrides.employmentStatus = employmentStatus;
    mutation.mutate(overrides);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>What if my situation changes?</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-xs text-slate-500">
          Try a hypothetical change and see how it affects this service. This never modifies your saved profile.
        </p>
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium">New annual income (₹)</label>
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              className="w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">New employment status</label>
            <select
              value={employmentStatus}
              onChange={(e) => setEmploymentStatus(e.target.value)}
              className="w-44 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">(no change)</option>
              <option value="employed">Employed</option>
              <option value="unemployed">Unemployed</option>
              <option value="self-employed">Self-employed</option>
              <option value="retired">Retired</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button size="sm" variant="secondary" onClick={recalculate} disabled={mutation.isPending}>
              {mutation.isPending ? "Recalculating..." : "Recalculate"}
            </Button>
          </div>
        </div>

        {mutation.data && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
            <span>Under this hypothetical:</span>
            <ResultBadge verdict={mutation.data.result.verdict} />
            <span className="text-xs text-slate-500">
              {mutation.data.result.satisfiedCount}/{mutation.data.result.totalConditions} conditions satisfied
            </span>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function ResultBadge({ verdict }: { verdict: "MATCH" | "NOT_MATCH" | "INCOMPLETE" }) {
  if (verdict === "MATCH") return <Badge variant="success">Still matches</Badge>;
  if (verdict === "INCOMPLETE") return <Badge variant="warning">Incomplete</Badge>;
  return <Badge variant="danger">No longer matches</Badge>;
}
