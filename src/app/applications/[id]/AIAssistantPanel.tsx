"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface EvidenceItem {
  sourceType: string;
  label: string;
  data: Record<string, unknown>;
}
interface AskResponse {
  recommendationId: string;
  answer: string;
  evidence: EvidenceItem[];
  provider: string;
  usedFallback: boolean;
}

const SUGGESTED_QUESTIONS = ["Why is my application blocked?", "What documents are missing?", "What should I do next?"];

export function AIAssistantPanel({ applicationId }: { applicationId: string }) {
  const [question, setQuestion] = useState("");
  const [showEvidence, setShowEvidence] = useState(false);

  const ask = useMutation({
    mutationFn: (q: string) =>
      api.post<AskResponse>("/api/ai/ask", { agent: "APPLICATION_AGENT", question: q, applicationId }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Civic assistant</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-xs text-slate-500">
          Answers are generated from this application&apos;s structured records only. This is a synthetic demo assistant, not an
          official determination, and it cannot approve or change your application.
        </p>

        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuestion(q);
                ask.mutate(q);
              }}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {q}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about this application..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            onKeyDown={(e) => {
              if (e.key === "Enter" && question.trim()) ask.mutate(question);
            }}
          />
          <Button size="sm" disabled={ask.isPending || !question.trim()} onClick={() => ask.mutate(question)}>
            {ask.isPending ? "Thinking..." : "Ask"}
          </Button>
        </div>

        {ask.data && (
          <div className="space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <div className="flex items-center gap-2">
              <Badge variant="info">{ask.data.provider}</Badge>
              {ask.data.usedFallback && <Badge variant="warning">Fallback used</Badge>}
            </div>
            <p className="text-sm">{ask.data.answer}</p>
            <button
              className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
              onClick={() => setShowEvidence((v) => !v)}
            >
              {showEvidence ? "Hide evidence" : "Show evidence"}
            </button>
            {showEvidence && (
              <div className="space-y-2">
                {ask.data.evidence.map((e, i) => (
                  <div key={i} className="rounded border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900">
                    <div className="mb-1 font-medium">{e.label}</div>
                    <div className="mb-1 text-slate-400">Source: {e.sourceType.replace(/_/g, " ").toLowerCase()}</div>
                    <pre className="overflow-x-auto whitespace-pre-wrap text-slate-600 dark:text-slate-400">{JSON.stringify(e.data, null, 2)}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
