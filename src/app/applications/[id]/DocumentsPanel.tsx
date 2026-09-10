"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DocumentRow } from "./types";

const STATUS_VARIANT: Record<DocumentRow["status"], "neutral" | "success" | "warning" | "danger" | "info"> = {
  NOT_PROVIDED: "neutral",
  UPLOADED: "info",
  UNDER_REVIEW: "info",
  VERIFIED: "success",
  REJECTED: "danger",
  CORRECTION_REQUIRED: "warning",
};

export function DocumentsPanel({ applicationId, documents, canUpload, canVerify }: { applicationId: string; documents: DocumentRow[]; canUpload: boolean; canVerify: boolean }) {
  const queryClient = useQueryClient();

  const upload = useMutation({
    mutationFn: (requirementId: string) =>
      api.post(`/api/applications/${applicationId}/documents`, {
        requirementId,
        fileName: `demo_document_${requirementId.slice(-6)}.pdf`,
        content: "Synthetic demo document content.",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["application", applicationId] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardBody className="space-y-2">
        {documents.map((doc) => (
          <DocumentRowItem
            key={doc.id}
            doc={doc}
            applicationId={applicationId}
            canUpload={canUpload}
            canVerify={canVerify}
            onUpload={() => upload.mutate(doc.requirementId)}
            uploading={upload.isPending}
          />
        ))}
      </CardBody>
    </Card>
  );
}

function DocumentRowItem({
  doc,
  applicationId,
  canUpload,
  canVerify,
  onUpload,
  uploading,
}: {
  doc: DocumentRow;
  applicationId: string;
  canUpload: boolean;
  canVerify: boolean;
  onUpload: () => void;
  uploading: boolean;
}) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [showVerify, setShowVerify] = useState(false);

  const verify = useMutation({
    mutationFn: (status: "VERIFIED" | "REJECTED" | "CORRECTION_REQUIRED") =>
      api.post(`/api/applications/${applicationId}/documents/${doc.requirementId}/verify`, { status, note: note || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["application", applicationId] });
      setShowVerify(false);
      setNote("");
    },
  });

  const canUploadNow = canUpload && ["NOT_PROVIDED", "REJECTED", "CORRECTION_REQUIRED"].includes(doc.status);
  const canVerifyNow = canVerify && ["UPLOADED", "UNDER_REVIEW"].includes(doc.status);

  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{doc.requirement.name}</div>
          <div className="text-xs text-slate-500">{doc.requirement.description}</div>
          {doc.verificationNote && <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">Note: {doc.verificationNote}</div>}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[doc.status]}>{doc.status.replace(/_/g, " ")}</Badge>
          <Badge variant="neutral">{doc.requirement.necessity}</Badge>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {canUploadNow && (
          <Button size="sm" variant="secondary" onClick={onUpload} disabled={uploading}>
            {uploading ? "Uploading..." : "Upload document (demo)"}
          </Button>
        )}
        {canVerifyNow && !showVerify && (
          <Button size="sm" variant="secondary" onClick={() => setShowVerify(true)}>
            Review document
          </Button>
        )}
      </div>
      {canVerifyNow && showVerify && (
        <div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
          <input
            placeholder="Optional note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => verify.mutate("VERIFIED")} disabled={verify.isPending}>
              Verify
            </Button>
            <Button size="sm" variant="secondary" onClick={() => verify.mutate("CORRECTION_REQUIRED")} disabled={verify.isPending}>
              Request correction
            </Button>
            <Button size="sm" variant="danger" onClick={() => verify.mutate("REJECTED")} disabled={verify.isPending}>
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
