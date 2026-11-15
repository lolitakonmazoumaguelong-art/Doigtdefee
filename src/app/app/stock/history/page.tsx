import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { MOVEMENT_LABELS } from "@/lib/catalog";
import { listStockMovements } from "@/lib/queries";

export const metadata = { title: "Stock movements" };

const dateTime = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Indian/Mauritius" });

export default async function StockHistoryPage() {
  const { org } = await requireSession();
  const movements = await listStockMovements(org.id);
  const stockIn = movements.filter((m) => m.delta > 0).reduce((s, m) => s + m.delta, 0);
  const stockOut = movements.filter((m) => m.delta < 0).reduce((s, m) => s - m.delta, 0);

  return (
    <div className="space-y-6">
      <header>
        <Link href="/app/stock" className="text-sm text-muted underline-offset-4 hover:underline">
          Stock
        </Link>
        <h1 className="page-title mt-1">Stock movements</h1>
        <p className="mt-2 text-sm text-muted">
          Last {movements.length} movements · <span className="text-moss">+{stockIn} in</span> · <span className="text-clay">−{stockOut} out</span>
        </p>
      </header>
      {movements.length === 0 ? (
        <p className="card p-6 text-sm text-muted">No stock movement yet. Entries appear here automatically with every delivery, invoice and stock count.</p>
      ) : (
        <ul className="card divide-y divide-line">
          {movements.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm sm:px-5">
              <span className={`w-12 shrink-0 font-semibold tabular-nums ${m.delta > 0 ? "text-moss" : "text-clay"}`}>
                {m.delta > 0 ? `+${m.delta}` : m.delta}
              </span>
              <span className="min-w-0 flex-1 basis-48">
                <Link href={`/app/stock/${m.productId}`} className="font-medium underline-offset-4 hover:underline">
                  {m.productName}
                </Link>
                <span className="block text-xs text-muted">
                  {MOVEMENT_LABELS[m.reason]}
                  {m.note && ` · ${m.note}`}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted">{dateTime.format(m.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
