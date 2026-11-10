"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { saveDocument } from "@/actions/documents";
import { useFormAction } from "@/components/use-form-action";
import { FormError, SubmitButton } from "@/components/ui";
import { categoryLabel } from "@/lib/catalog";
import { computeTotals, formatMoney } from "@/lib/format";

type CatalogItem = {
  id: string;
  name: string;
  category: string;
  kind: string;
  unitPrice: number;
  stock: number;
};

type Line = { key: number; productId: string; description: string; quantity: string; unitPrice: string };

export type DocumentFormValues = {
  id?: string;
  type: "devis" | "facture";
  clientId: string;
  issueDate: string;
  dueDate: string;
  taxRate: number;
  notes: string;
  items: { productId: string | null; description: string; quantity: number; unitPrice: number }[];
};

const toNumber = (v: string) => {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function DocumentForm({
  values,
  clients,
  catalog,
  currency,
}: {
  values: DocumentFormValues;
  clients: { id: string; name: string }[];
  catalog: CatalogItem[];
  currency: string;
}) {
  const { state, pending, formProps } = useFormAction(saveDocument);
  const nextKey = useRef(values.items.length + 1);
  const [taxRate, setTaxRate] = useState(String(values.taxRate));
  const [lines, setLines] = useState<Line[]>(() =>
    values.items.length
      ? values.items.map((item, i) => ({
          key: i,
          productId: item.productId ?? "",
          description: item.description,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice / 100),
        }))
      : [{ key: 0, productId: "", description: "", quantity: "1", unitPrice: "" }],
  );

  const isQuote = values.type === "devis";
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const categories = [...new Set(catalog.map((p) => p.category))];

  const update = (key: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const pickProduct = (key: number, productId: string) => {
    const product = byId.get(productId);
    update(
      key,
      product
        ? { productId, description: product.name, unitPrice: String(product.unitPrice / 100) }
        : { productId: "" },
    );
  };

  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { key: nextKey.current++, productId: "", description: "", quantity: "1", unitPrice: "" },
    ]);

  const numeric = lines.map((l) => ({
    productId: l.productId || null,
    description: l.description,
    quantity: toNumber(l.quantity),
    unitPrice: toNumber(l.unitPrice),
  }));
  const totals = computeTotals(
    numeric.map((l) => ({ quantity: l.quantity, unitPrice: Math.round(l.unitPrice * 100) })),
    toNumber(taxRate),
  );

  return (
    <form {...formProps} className="space-y-6">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <input type="hidden" name="type" value={values.type} />
      <input type="hidden" name="items" value={JSON.stringify(numeric)} />

      <section className="card grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
        <div>
          <label className="label" htmlFor="clientId">
            Client
          </label>
          <select id="clientId" name="clientId" className="input" defaultValue={values.clientId} required>
            <option value="" disabled>
              Choisir...
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="issueDate">
            Date
          </label>
          <input id="issueDate" name="issueDate" type="date" className="input" defaultValue={values.issueDate} required />
        </div>
        <div>
          <label className="label" htmlFor="dueDate">
            {isQuote ? "Valable jusqu'au" : "À payer avant le"}
          </label>
          <input id="dueDate" name="dueDate" type="date" className="input" defaultValue={values.dueDate} />
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-2xl">Matériel et prestations</h2>
        <div className="mt-4 space-y-4">
          {lines.map((line, index) => {
            const product = byId.get(line.productId);
            const short = product && product.kind === "produit" && toNumber(line.quantity) > product.stock;
            return (
              <div key={line.key} className="rounded-xl border border-line bg-paper/40 p-3 sm:p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_5.5rem_9rem_auto]">
                  <div className="space-y-2">
                    {catalog.length > 0 && (
                      <select
                        aria-label={`Article du catalogue, ligne ${index + 1}`}
                        className="input"
                        value={line.productId}
                        onChange={(e) => pickProduct(line.key, e.target.value)}
                      >
                        <option value="">Ligne libre (hors catalogue)</option>
                        {categories.map((category) => (
                          <optgroup key={category} label={categoryLabel(category)}>
                            {catalog
                              .filter((p) => p.category === category)
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                  {p.kind === "produit" ? ` (${p.stock} dispo)` : ""}
                                </option>
                              ))}
                          </optgroup>
                        ))}
                      </select>
                    )}
                    <input
                      aria-label={`Désignation, ligne ${index + 1}`}
                      className="input"
                      placeholder="Désignation"
                      value={line.description}
                      onChange={(e) => update(line.key, { description: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor={`qty-${line.key}`}>
                      Qté
                    </label>
                    <input
                      id={`qty-${line.key}`}
                      className="input"
                      inputMode="decimal"
                      value={line.quantity}
                      onChange={(e) => update(line.key, { quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor={`price-${line.key}`}>
                      Prix unitaire
                    </label>
                    <input
                      id={`price-${line.key}`}
                      className="input"
                      inputMode="decimal"
                      placeholder="0"
                      value={line.unitPrice}
                      onChange={(e) => update(line.key, { unitPrice: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      className="btn btn-ghost px-3"
                      aria-label={`Supprimer la ligne ${index + 1}`}
                      disabled={lines.length === 1}
                      onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className={short ? "text-clay" : "text-muted"}>
                    {short ? `Attention : seulement ${product.stock} disponible(s), le reste sera à commander.` : ""}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatMoney(Math.round(toNumber(line.quantity) * toNumber(line.unitPrice) * 100), currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <button type="button" className="btn btn-ghost mt-4" onClick={addLine}>
          + Ajouter une ligne
        </button>

        <div className="mt-6 flex justify-end border-t border-line pt-5">
          <dl className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Total HT</dt>
              <dd className="tabular-nums">{formatMoney(totals.subtotal, currency)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted">
                <label htmlFor="taxRate">TVA (%)</label>
                <input
                  id="taxRate"
                  name="taxRate"
                  inputMode="decimal"
                  className="input w-20 py-1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
              </dt>
              <dd className="tabular-nums">{formatMoney(totals.tax, currency)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
              <dt>Total TTC</dt>
              <dd className="tabular-nums">{formatMoney(totals.total, currency)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <label className="label" htmlFor="notes">
          Note pour le client
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="input"
          placeholder={isQuote ? "Délai de pose, garantie, acompte demandé..." : "Modalités de paiement, remerciements..."}
          defaultValue={values.notes}
        />
      </section>

      <FormError message={state?.error} />
      <div className="flex gap-2">
        <SubmitButton pending={pending}>{values.id ? "Enregistrer" : isQuote ? "Créer le devis" : "Créer la facture"}</SubmitButton>
        <Link href={values.id ? `/app/documents/${values.id}` : "/app/documents"} className="btn btn-ghost">
          Annuler
        </Link>
      </div>
    </form>
  );
}
