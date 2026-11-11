import Link from "next/link";
import { Badge } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { categoryLabel } from "@/lib/catalog";
import { formatMoney } from "@/lib/format";
import { getStockOverview } from "@/lib/stock";

export const metadata = { title: "Stock" };

export default async function StockPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { org } = await requireSession();
  const view = (await searchParams).vue;
  const everything = await getStockOverview(org.id);

  const active = everything.filter((p) => !p.archived);
  const archived = everything.filter((p) => p.archived);
  const goods = active.filter((p) => p.kind === "produit");
  const toOrder = goods.filter((p) => p.toOrder > 0);
  const stockValue = goods.reduce((s, p) => s + Math.max(p.stock, 0) * p.costPrice, 0);
  const shown =
    view === "prestations" ? active.filter((p) => p.kind === "service") : view === "arretes" ? archived : active;

  const tabs = [
    { id: undefined, label: `Catalogue (${active.length})` },
    { id: "prestations", label: "Services" },
    { id: "arretes", label: `Discontinued (${archived.length})` },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Stock</h1>
          <p className="mt-2 text-sm text-muted">
            {goods.length} item(s) · cost value {formatMoney(stockValue, org.currency)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/stock/reorder" className={`btn ${toOrder.length ? "btn-accent" : "btn-ghost"}`}>
            To order ({toOrder.length})
          </Link>
          <Link href="/app/stock/new" className="btn btn-primary">
            Add an item
          </Link>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.id ? `/app/stock?vue=${tab.id}` : "/app/stock"}
            className={`rounded-full px-3 py-1.5 text-sm whitespace-nowrap ${
              view === tab.id ? "bg-ink text-paper" : "text-muted hover:bg-ink/5"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {shown.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-display text-2xl">
            {everything.length === 0 ? "Your catalogue is empty" : "Nothing to show here"}
          </p>
          <p className="mt-2 text-sm text-muted">
            {everything.length === 0
              ? "Add your cameras, recorders, cables and installation packages to use them in your quotes."
              : view === "arretes"
                ? "Products you discontinue will appear here, with their history."
                : "No items in this view."}
          </p>
        </div>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {shown.map((p) => {
            const isService = p.kind === "service";
            const details = [
              p.reserved > 0 && `${p.reserved} reserved`,
              p.onOrder > 0 && `${p.onOrder} on order`,
              p.daysLeft !== null && `≈ ${p.daysLeft} days of stock`,
            ].filter(Boolean);
            return (
              <li key={p.id}>
                <Link
                  href={`/app/stock/${p.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-paper/60 sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-sm text-muted">
                      {[categoryLabel(p.category), p.reference, p.supplier].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <p className="hidden shrink-0 text-sm tabular-nums sm:block">{formatMoney(p.unitPrice, org.currency)}</p>
                  <div className="w-36 shrink-0 text-right">
                    {isService ? (
                      <Badge label="Service" tone="neutral" />
                    ) : p.archived ? (
                      <Badge label={`Discontinued · ${p.stock} left`} tone="neutral" />
                    ) : p.available <= 0 ? (
                      <Badge label={p.stock > 0 ? "All reserved" : "Out of stock"} tone="bad" />
                    ) : p.toOrder > 0 ? (
                      <Badge label={`${p.available} available · low`} tone="warn" />
                    ) : (
                      <Badge label={`${p.available} available`} tone="good" />
                    )}
                    {details.length > 0 && <p className="mt-1 text-xs text-muted">{details.join(" · ")}</p>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
