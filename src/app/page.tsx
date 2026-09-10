"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

const STEPS = ["Citizen", "Eligibility", "Service", "Documents", "Application", "Verification", "Decision", "Benefit"];

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  if (loading || user) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="mb-3 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
        Demo / synthetic public-service data — not affiliated with any government
      </div>
      <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
        Turn public services into an understandable, actionable journey.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
        CivicFlow is a public-service intelligence platform: a structured service catalog, a deterministic eligibility
        engine, a real application workflow, and an evidence-grounded AI assistant — not just a chatbot.
      </p>

      <div className="mt-8 flex gap-3">
        <Link href="/register">
          <Button size="md">Create a citizen account</Button>
        </Link>
        <Link href="/login">
          <Button variant="secondary" size="md">
            Sign in
          </Button>
        </Link>
      </div>

      <Card className="mt-14">
        <CardBody>
          <div className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">The citizen service graph</div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {STEPS.map((step, i) => (
              <span key={step} className="flex items-center gap-2">
                <span className="rounded-full border border-slate-300 px-3 py-1 text-slate-700 dark:border-slate-700 dark:text-slate-300">
                  {step}
                </span>
                {i < STEPS.length - 1 && <span className="text-slate-400">→</span>}
              </span>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <FeatureCard title="Deterministic eligibility" body="A rules engine — AND/OR/NOT over structured facts — never an LLM guess." />
        <FeatureCard title="Real application workflow" body="A validated state machine with a blocker engine that explains why an application is stuck." />
        <FeatureCard title="Evidence-grounded AI" body="Every AI answer cites the structured record it was generated from, and never approves anything." />
      </div>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardBody>
        <div className="mb-1 text-sm font-semibold">{title}</div>
        <div className="text-sm text-slate-600 dark:text-slate-400">{body}</div>
      </CardBody>
    </Card>
  );
}
