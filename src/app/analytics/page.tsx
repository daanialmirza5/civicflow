"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api/client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface AnalyticsResponse {
  isDemoData: boolean;
  totalApplications: number;
  statusDistribution: { status: string; count: number }[];
  bottlenecks: { reasonCode: string; sampleReason: string; count: number; percentage: number }[];
  avgProcessingDays: number | null;
  documentRejectionRate: number | null;
  serviceDemand: { serviceName: string; count: number }[];
  overdueCount: number;
}

export default function AnalyticsPage() {
  return (
    <RequireAuth roles={["CASE_WORKER", "SERVICE_ADMIN", "SYSTEM_ADMIN"]}>
      <AnalyticsBody />
    </RequireAuth>
  );
}

function AnalyticsBody() {
  const { data } = useQuery({ queryKey: ["analytics"], queryFn: () => api.get<AnalyticsResponse>("/api/analytics") });
  if (!data) return <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-slate-500">Loading...</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <Badge variant="warning">Demo analytics based on synthetic data</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Total applications" value={data.totalApplications} />
        <Stat label="Avg. processing time" value={data.avgProcessingDays !== null ? `${data.avgProcessingDays}d` : "—"} />
        <Stat label="Document rejection rate" value={data.documentRejectionRate !== null ? `${data.documentRejectionRate}%` : "—"} />
        <Stat label="Overdue deadlines" value={data.overdueCount} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bottleneck intelligence — where are applications getting stuck?</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {data.bottlenecks.length === 0 && <p className="text-sm text-slate-500">No open blockers in the dataset.</p>}
          {data.bottlenecks.map((b, i) => (
            <div key={b.reasonCode} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
              <div>
                <span className="mr-2 font-semibold">#{i + 1}</span>
                {b.sampleReason}
                <div className="text-xs text-slate-500">{b.reasonCode}</div>
              </div>
              <Badge variant="danger">
                {b.percentage}% ({b.count})
              </Badge>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Application status distribution</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.statusDistribution} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="status" width={160} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service demand</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.serviceDemand} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="serviceName" width={200} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardBody>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </CardBody>
    </Card>
  );
}
