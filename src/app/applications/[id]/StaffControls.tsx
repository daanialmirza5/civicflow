"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { statusLabel } from "@/lib/utils";
import { CaseNoteRow } from "./types";

const TRANSITION_LABELS: Record<string, string> = {
  UNDER_REVIEW: "Move to review",
  DOCUMENT_VERIFICATION: "Move to document verification",
  ADDITIONAL_INFORMATION_REQUIRED: "Request additional information",
  APPROVED: "Approve application",
  REJECTED: "Reject application",
  CANCELLED: "Cancel application",
};

export function StaffControls({ applicationId, allowedNextStatuses, caseNotes }: { applicationId: string; allowedNextStatuses: string[]; caseNotes: CaseNoteRow[] }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [newCaseNote, setNewCaseNote] = useState("");

  const transition = useMutation({
    mutationFn: (toStatus: string) => api.post(`/api/applications/${applicationId}/transition`, { toStatus, note: note || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["application", applicationId] });
      setNote("");
    },
  });

  const addNote = useMutation({
    mutationFn: () => api.post(`/api/applications/${applicationId}/notes`, { note: newCaseNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["application", applicationId] });
      setNewCaseNote("");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Case worker actions</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        {allowedNextStatuses.length > 0 && (
          <div className="space-y-2">
            <input
              placeholder="Optional note for this transition..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <div className="flex flex-wrap gap-2">
              {allowedNextStatuses.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={s === "REJECTED" || s === "CANCELLED" ? "danger" : s === "APPROVED" ? "primary" : "secondary"}
                  disabled={transition.isPending}
                  onClick={() => transition.mutate(s)}
                >
                  {TRANSITION_LABELS[s] ?? statusLabel(s)}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm font-medium">Case notes</div>
          {caseNotes.length === 0 && <p className="text-xs text-slate-500">No notes yet.</p>}
          {caseNotes.map((n) => (
            <div key={n.id} className="rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800">
              <div className="font-medium">{n.author.name}</div>
              <div>{n.note}</div>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              placeholder="Add a case note..."
              value={newCaseNote}
              onChange={(e) => setNewCaseNote(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <Button size="sm" variant="secondary" disabled={!newCaseNote.trim() || addNote.isPending} onClick={() => addNote.mutate()}>
              Add
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
