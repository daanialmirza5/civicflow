// Bottleneck intelligence (build brief §48): aggregates real blocker
// reason codes across an application set. No fabricated percentages —
// this only ever summarizes rows actually passed in.

export interface BlockerRow {
  reasonCode: string;
  reason: string;
}

export interface BottleneckSummary {
  reasonCode: string;
  sampleReason: string;
  count: number;
  percentage: number;
}

export function summarizeBottlenecks(blockers: BlockerRow[]): BottleneckSummary[] {
  if (blockers.length === 0) return [];
  const byCode = new Map<string, { sampleReason: string; count: number }>();
  for (const b of blockers) {
    const existing = byCode.get(b.reasonCode);
    if (existing) existing.count += 1;
    else byCode.set(b.reasonCode, { sampleReason: b.reason, count: 1 });
  }
  return [...byCode.entries()]
    .map(([reasonCode, v]) => ({
      reasonCode,
      sampleReason: v.sampleReason,
      count: v.count,
      percentage: Math.round((v.count / blockers.length) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);
}

export interface StatusCount {
  status: string;
  count: number;
}

export function summarizeStatusDistribution(statuses: string[]): StatusCount[] {
  const byStatus = new Map<string, number>();
  for (const s of statuses) byStatus.set(s, (byStatus.get(s) ?? 0) + 1);
  return [...byStatus.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
}
