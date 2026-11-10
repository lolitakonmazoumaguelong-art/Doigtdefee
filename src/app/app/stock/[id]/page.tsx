import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProduct, setProductArchived } from "@/actions/products";
import { InventoryForm, MovementForm } from "@/components/movement-form";
import { ProductForm } from "@/components/product-form";
import { ConfirmButton } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { MOVEMENT_LABELS, categoryLabel } from "@/lib/catalog";
import { formatMoney } from "@/lib/format";
import { getProduct } from "@/lib/queries";
import { getStockOverview } from "@/lib/stock";

export const metadata = { title: "Article" };

const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { org } = await requireSession();
  const data = await getProduct(org.id, (await params).id);
  if (!data) notFound();
  const { product, movements } = data;
  const overview = await getStockOverview(org.id);
  const line = overview.find((p) => p.id === product.id);
  const suppliers = [...new Set(overview.map((p) => p.supplier).filter(Boolean))];
  const isService = product.kind === "service";
  const margin = product.unitPrice - product.costPrice;

  return (
    <div className="space-y-8">
      <header>
        <Link href="/app/stock" className="text-sm text-muted underline-offset-4 hover:underline">
          Stock
        </Link>
        <h1 className="page-title mt-1">{product.name}</h1>
        {product.archived && (
          <p className="mt-3 inline-block rounded-lg border border-line bg-chalk/30 px-3 py-1.5 text-sm">
            Produit arrêté : il n&apos;est plus proposé dans les devis ni dans les commandes.
          </p>
        )}
        <p className="mt-2 text-sm text-muted">
          {[categoryLabel(product.category), product.reference].filter(Boolean).join(" · ")}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {!isService && (
          <div className={`card p-5 ${product.stock <= product.minStock ? "border-clay/40" : ""}`}>
            <p className="label">En stock</p>
            <p className={`text-2xl font-semibold tabular-nums ${product.stock <= product.minStock ? "text-clay" : ""}`}>
              {product.stock}
            </p>
            <p className="mt-1 text-xs text-muted">Alerte à {product.minStock}</p>
          </div>
        )}
        <div className="card p-5">
          <p className="label">Prix de vente</p>
          <p className="text-2xl font-semibold tabular-nums">{formatMoney(product.unitPrice, org.currency)}</p>
        </div>
        <div className="card p-5">
          <p className="label">Prix d&apos;achat</p>
          <p className="text-2xl font-semibold tabular-nums">{formatMoney(product.costPrice, org.currency)}</p>
        </div>
        <div className="card p-5">
          <p className="label">Marge unitaire</p>
          <p className="text-2xl font-semibold tabular-nums">{formatMoney(margin, org.currency)}</p>
        </div>
      </section>

      {!isService && line && (
        <section className="card flex flex-wrap gap-x-10 gap-y-3 p-5 text-sm">
          <p>
            <span className="label">Disponible à la vente</span>
            <span className="text-lg font-semibold tabular-nums">{line.available}</span>
          </p>
          <p>
            <span className="label">Réservé à des clients</span>
            <span className="text-lg font-semibold tabular-nums">{line.reserved}</span>
          </p>
          <p>
            <span className="label">En commande</span>
            <span className="text-lg font-semibold tabular-nums">{line.onOrder}</span>
          </p>
          <p>
            <span className="label">Vendu en 30 jours</span>
            <span className="text-lg font-semibold tabular-nums">{line.sold30}</span>
          </p>
          <p>
            <span className="label">Stock restant estimé</span>
            <span className="text-lg font-semibold tabular-nums">
              {line.daysLeft === null ? "Pas assez de ventes" : `≈ ${line.daysLeft} jours`}
            </span>
          </p>
          {line.toOrder > 0 && (
            <p className="basis-full text-clay">
              Conseil : commander {line.toOrder} unité(s).{" "}
              <Link href="/app/stock/reappro" className="underline underline-offset-4">
                Voir la liste à commander
              </Link>
            </p>
          )}
        </section>
      )}

      {!isService && (
        <section className="grid gap-4 lg:grid-cols-[20rem_1fr]">
          <div className="space-y-4">
            <MovementForm productId={product.id} />
            <InventoryForm productId={product.id} />
          </div>
          <div className="card overflow-hidden">
            <p className="label px-5 pt-5">Historique</p>
            {movements.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-muted">Aucun mouvement enregistré.</p>
            ) : (
              <ul className="divide-y divide-line">
                {movements.map((m) => (
                  <li key={m.id} className="flex items-center gap-4 px-5 py-2.5 text-sm">
                    <span
                      className={`w-12 shrink-0 font-semibold tabular-nums ${m.delta > 0 ? "text-moss" : "text-clay"}`}
                    >
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {MOVEMENT_LABELS[m.reason]}
                      {m.note && <span className="text-muted"> · {m.note}</span>}
                    </span>
                    <span className="shrink-0 text-xs text-muted">{dateTime.format(m.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Modifier l&apos;article</h2>
        <ProductForm
          currency={org.currency}
          suppliers={suppliers}
          product={{
            id: product.id,
            name: product.name,
            reference: product.reference,
            category: product.category,
            kind: product.kind,
            unitPrice: product.unitPrice,
            costPrice: product.costPrice,
            minStock: product.minStock,
            targetStock: product.targetStock,
            supplier: product.supplier,
          }}
        />
        <form action={setProductArchived}>
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="archived" value={product.archived ? "0" : "1"} />
          <button className="btn btn-ghost">
            {product.archived ? "Remettre au catalogue" : "Produit arrêté : retirer du catalogue"}
          </button>
        </form>
        <form action={deleteProduct}>
          <input type="hidden" name="id" value={product.id} />
          <ConfirmButton message={`Supprimer ${product.name} du catalogue ? Les devis et factures existants gardent leurs lignes.`}>
            Supprimer définitivement
          </ConfirmButton>
        </form>
      </section>
    </div>
  );
}
