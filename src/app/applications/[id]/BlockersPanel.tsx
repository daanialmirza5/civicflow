import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BlockerRow } from "./types";

export function BlockersPanel({ blockers }: { blockers: BlockerRow[] }) {
  if (blockers.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-emerald-700 dark:text-emerald-400">No open blockers — this application can proceed.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Why is this stuck?</CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        {blockers.map((b, i) => (
          <div key={i} className="rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-rose-800 dark:text-rose-300">{b.reason}</span>
              <Badge variant={b.owner === "CITIZEN" ? "warning" : "info"}>Owner: {b.owner}</Badge>
            </div>
            <div className="mb-3 text-sm text-slate-700 dark:text-slate-300">
              Required action: <span className="font-medium">{b.requiredAction}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              {b.chain.map((step, j) => (
                <span key={j} className="flex items-center gap-1.5">
                  <span className="rounded-full bg-white px-2 py-0.5 shadow-sm dark:bg-slate-800">{step}</span>
                  {j < b.chain.length - 1 && <span>→</span>}
                </span>
              ))}
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
