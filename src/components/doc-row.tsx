import Link from "next/link";
import type { DocStatus, DocType } from "@/db/schema";
import { Badge } from "@/components/ui";
import { formatDate, formatMoney, statusInfo, typeLabel } from "@/lib/format";

export type DocRowData = {
  id: string;
  type: DocType;
  status: DocStatus;
  number: string;
  issueDate: string;
  dueDate: string | null;
  total: number;
  clientName: string;
};

export function DocList({ docs, currency }: { docs: DocRowData[]; currency: string }) {
  return (
    <ul className="card divide-y divide-line overflow-hidden">
      {docs.map((doc) => {
        const status = statusInfo(doc);
        return (
          <li key={doc.id}>
            <Link
              href={`/app/documents/${doc.id}`}
              className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-paper/60 sm:grid-cols-[8rem_1fr_7rem_6.5rem_8rem] sm:px-5"
            >
              <span className="order-1 text-sm font-medium tabular-nums">
                {doc.number}
                <span className="ml-2 text-xs font-normal text-muted sm:hidden">{typeLabel(doc.type)}</span>
              </span>
              <span className="order-3 truncate text-sm text-muted sm:order-2 sm:text-ink">{doc.clientName}</span>
              <span className="order-5 hidden text-sm text-muted sm:order-3 sm:block">{formatDate(doc.issueDate)}</span>
              <span className="order-4 justify-self-end sm:justify-self-start">
                <Badge {...status} />
              </span>
              <span className="order-2 justify-self-end text-sm font-medium tabular-nums sm:order-5">
                {formatMoney(doc.total, currency)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
