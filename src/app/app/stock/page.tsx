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
    { id: "prestations", label: "Prestations" },
    { id: "arretes", label: `Arrêtés (${archived.length})` },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Stock</h1>
          <p className="mt-2 text-sm text-muted">
            {goods.length} article(s) · valeur d&apos;achat {formatMoney(stockValue, org.currency)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/stock/reappro" className={`btn ${toOrder.length ? "btn-accent" : "btn-ghost"}`}>
            À commander ({toOrder.length})
          </Link>
          <Link href="/app/stock/nouveau" className="btn btn-primary">
            Ajouter un article
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
            {everything.length === 0 ? "Ton catalogue est vide" : "Rien à afficher ici"}
          </p>
          <p className="mt-2 text-sm text-muted">
            {everything.length === 0
              ? "Ajoute tes caméras, enregistreurs, câbles et forfaits de pose pour les retrouver dans tes devis."
              : view === "arretes"
                ? "Les produits que tu retires du marché apparaîtront ici, avec leur historique."
                : "Aucun article dans cette vue."}
          </p>
        </div>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {shown.map((p) => {
            const isService = p.kind === "service";
            const details = [
              p.reserved > 0 && `${p.reserved} réservé(s)`,
              p.onOrder > 0 && `${p.onOrder} en commande`,
              p.daysLeft !== null && `≈ ${p.daysLeft} j de stock`,
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
                      <Badge label="Prestation" tone="neutral" />
                    ) : p.archived ? (
                      <Badge label={`Arrêté · ${p.stock} restant(s)`} tone="neutral" />
                    ) : p.available <= 0 ? (
                      <Badge label={p.stock > 0 ? "Tout est réservé" : "Rupture"} tone="bad" />
                    ) : p.toOrder > 0 ? (
                      <Badge label={`${p.available} dispo · bas`} tone="warn" />
                    ) : (
                      <Badge label={`${p.available} dispo`} tone="good" />
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
