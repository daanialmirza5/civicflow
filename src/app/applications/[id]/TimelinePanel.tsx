import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/utils";
import { EventRow } from "./types";

export function TimelinePanel({ events }: { events: EventRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardBody>
        <ol className="space-y-3 border-l border-slate-200 pl-4 dark:border-slate-800">
          {events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-500" />
              <div className="text-sm font-medium">{e.action.replace(/_/g, " ")}</div>
              <div className="text-xs text-slate-500">
                {formatDateTime(e.createdAt)} · {e.actor}
              </div>
              {e.notes && <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{e.notes}</div>}
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}
