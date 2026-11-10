import Link from "next/link";
import type { InterventionStatus, InterventionType } from "@/db/schema";
import { Badge } from "@/components/ui";
import { interventionStatus, interventionTypeLabel } from "@/lib/catalog";
import { formatDate } from "@/lib/format";

export type InterventionRow = {
  id: string;
  title: string;
  type: InterventionType;
  status: InterventionStatus;
  scheduledDate: string;
  scheduledTime: string;
  technician: string;
  clientName: string;
};

export function InterventionList({ rows, showClient = true }: { rows: InterventionRow[]; showClient?: boolean }) {
  return (
    <ul className="card divide-y divide-line overflow-hidden">
      {rows.map((row) => {
        const status = interventionStatus(row.status);
        return (
          <li key={row.id}>
            <Link
              href={`/app/interventions/${row.id}`}
              className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-paper/60 sm:px-5"
            >
              <div className="w-24 shrink-0 text-sm">
                <p className="font-medium">{formatDate(row.scheduledDate)}</p>
                {row.scheduledTime && <p className="text-muted tabular-nums">{row.scheduledTime}</p>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{row.title}</p>
                <p className="truncate text-sm text-muted">
                  {[interventionTypeLabel(row.type), showClient && row.clientName, row.technician]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <Badge label={status.label} tone={status.tone} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
