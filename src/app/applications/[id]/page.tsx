"use client";

import { use } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api/client";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { statusLabel } from "@/lib/utils";
import { ApplicationDetailResponse } from "./types";
import { BlockersPanel } from "./BlockersPanel";
import { DocumentsPanel } from "./DocumentsPanel";
import { TimelinePanel } from "./TimelinePanel";
import { AIAssistantPanel } from "./AIAssistantPanel";
import { StaffControls } from "./StaffControls";
import Link from "next/link";

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <ApplicationDetailBody id={id} />
    </RequireAuth>
  );
}

function ApplicationDetailBody({ id }: { id: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["application", id],
    queryFn: () => api.get<ApplicationDetailResponse>(`/api/applications/${id}`),
  });

  const submit = useMutation({
    mutationFn: () => api.post(`/api/applications/${id}/submit`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["application", id] }),
  });

  if (isLoading || !data) return <div className="mx-auto max-w-4xl px-4 py-16 text-sm text-slate-500">Loading...</div>;

  const { application, blockers, progressPercent, allowedNextStatuses } = data;
  const isStaff = user && user.role !== "CITIZEN";
  const isOwner = user?.role === "CITIZEN";

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <Link href={isStaff ? "/case-worker" : "/applications"} className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          ← Back
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{application.service.name}</h1>
            {isStaff && <p className="text-sm text-slate-500">Citizen: {application.citizenProfile.user.name}</p>}
          </div>
          <Badge variant={blockers.length > 0 ? "danger" : "neutral"}>{statusLabel(application.status)}</Badge>
        </div>
      </div>

      <Card>
        <CardBody>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Application progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
          {blockers.length > 0 && (
            <div className="mt-2 text-xs text-rose-600">
              Blocked: {blockers[0].reason}
            </div>
          )}
          {application.status === "DRAFT" && isOwner && (
            <div className="mt-4">
              <Button size="sm" disabled={submit.isPending} onClick={() => submit.mutate()}>
                {submit.isPending ? "Submitting..." : "Submit application"}
              </Button>
            </div>
          )}
          {application.benefit && (
            <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
              Benefit granted: {application.benefit.description}
            </div>
          )}
        </CardBody>
      </Card>

      <BlockersPanel blockers={blockers} />

      <DocumentsPanel
        applicationId={id}
        documents={application.documents}
        canUpload={Boolean(isOwner)}
        canVerify={Boolean(isStaff)}
      />

      {isStaff && (
        <StaffControls applicationId={id} allowedNextStatuses={allowedNextStatuses} caseNotes={application.caseNotes} />
      )}

      <AIAssistantPanel applicationId={id} />

      <TimelinePanel events={application.events} />
    </div>
  );
}
