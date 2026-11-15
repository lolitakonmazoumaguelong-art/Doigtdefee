"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { saveDocument } from "@/actions/documents";
import { useFormAction } from "@/components/use-form-action";
import { FormError, SubmitButton } from "@/components/ui";
import { categoryLabel } from "@/lib/catalog";
import { computeTotals, formatMoney, parseNumber } from "@/lib/format";

type CatalogItem = {
  id: string;
  name: string;
  reference: string;
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
  const n = parseNumber(v);
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
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [lines, setLines] = useState<Line[]>(() =>
    values.items.map((item, i) => ({
      key: i,
      productId: item.productId ?? "",
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice / 100),
    })),
  );

  const isQuote = values.type === "devis";
  const byId = useMemo(() => new Map(catalog.map((p) => [p.id, p])), [catalog]);

  // Recherche dans le catalogue : nom, référence ou catégorie
  const matches = useMemo(() => {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return catalog;
    return catalog.filter((p) => {
      const haystack = `${p.name} ${p.reference} ${categoryLabel(p.category)}`.toLowerCase();
      return words.every((w) => haystack.includes(w));
    });
  }, [catalog, search]);
  const shown = showAll || search ? matches.slice(0, 50) : matches.slice(0, 6);

  const update = (key: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  // Un clic ajoute l'article ; un deuxième clic augmente simplement la quantité
  const addProduct = (product: CatalogItem) =>
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, quantity: String(toNumber(l.quantity) + 1) } : l));
      }
      return [
        ...prev,
        {
          key: nextKey.current++,
          productId: product.id,
          description: product.name,
          quantity: "1",
          unitPrice: String(product.unitPrice / 100),
        },
      ];
    });

  const addFreeLine = () =>
    setLines((prev) => [...prev, { key: nextKey.current++, productId: "", description: "", quantity: "1", unitPrice: "" }]);

  const step = (line: Line, delta: number) =>
    update(line.key, { quantity: String(Math.max(1, Math.round((toNumber(line.quantity) + delta) * 100) / 100)) });

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
  const inDocument = (id: string) => lines.find((l) => l.productId === id);

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
              Choose...
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
            {isQuote ? "Valid until" : "Due by"}
          </label>
          <input id="dueDate" name="dueDate" type="date" className="input" defaultValue={values.dueDate} />
        </div>
      </section>

      {catalog.length > 0 && (
        <section className="card p-5 sm:p-6">
          <h2 className="font-display text-2xl">Add from your catalogue</h2>
          <p className="mt-1 text-sm text-muted">Tap an item to add it. Tap again to add one more.</p>
          <label className="sr-only" htmlFor="catalog-search">
            Search the catalogue
          </label>
          <input
            id="catalog-search"
            type="search"
            className="input mt-4"
            placeholder={`Search ${catalog.length} items by name, reference or category...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              // Entrée ajoute le premier résultat au lieu d'envoyer le formulaire
              e.preventDefault();
              if (search && matches[0]) addProduct(matches[0]);
            }}
          />
          {shown.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No item matches “{search}”. Add it as a free line below.</p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {shown.map((product) => {
                const line = inDocument(product.id);
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => addProduct(product)}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                        line ? "border-ink bg-chalk/40" : "border-line bg-card hover:bg-paper"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{product.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {formatMoney(product.unitPrice, currency)}
                          {product.kind === "produit" ? ` · ${product.stock} available` : " · Service"}
                        </span>
                      </span>
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                          line ? "bg-ink text-paper" : "bg-ink/8 text-ink"
                        }`}
                      >
                        {line ? `×${line.quantity}` : "+"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {!search && matches.length > 6 && (
            <button type="button" className="btn btn-ghost mt-3" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show fewer" : `Show more (${matches.length} items)`}
            </button>
          )}
          {search && matches.length > 50 && <p className="mt-3 text-xs text-muted">Showing the first 50 results. Keep typing to narrow down.</p>}
        </section>
      )}

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl">
            Lines <span className="text-muted">({lines.length})</span>
          </h2>
          <button type="button" className="btn btn-ghost" onClick={addFreeLine}>
            + Add a free line
          </button>
        </div>

        {lines.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
            Nothing here yet. {catalog.length > 0 ? "Pick items above, or add a free line." : "Add a free line to start."}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {lines.map((line, index) => {
              const product = byId.get(line.productId);
              const short = product && product.kind === "produit" && toNumber(line.quantity) > product.stock;
              return (
                <li key={line.key} className="rounded-xl border border-line bg-paper/40 p-3">
                  <div className="flex items-start gap-2">
                    <input
                      aria-label={`Description, line ${index + 1}`}
                      className="input"
                      placeholder="Description"
                      value={line.description}
                      onChange={(e) => update(line.key, { description: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-ghost shrink-0 px-3 text-clay"
                      aria-label={`Remove line ${index + 1}`}
                      onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
                    <div>
                      <label className="label" htmlFor={`qty-${line.key}`}>
                        Qty
                      </label>
                      <div className="flex items-center gap-1">
                        <button type="button" className="btn btn-ghost size-10 px-0" aria-label={`Decrease quantity, line ${index + 1}`} onClick={() => step(line, -1)}>
                          −
                        </button>
                        <input
                          id={`qty-${line.key}`}
                          className="input w-16 text-center"
                          inputMode="decimal"
                          value={line.quantity}
                          onChange={(e) => update(line.key, { quantity: e.target.value })}
                          required
                        />
                        <button type="button" className="btn btn-ghost size-10 px-0" aria-label={`Increase quantity, line ${index + 1}`} onClick={() => step(line, 1)}>
                          +
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="label" htmlFor={`price-${line.key}`}>
                        Unit price
                      </label>
                      <input
                        id={`price-${line.key}`}
                        className="input w-32"
                        inputMode="decimal"
                        placeholder="0"
                        value={line.unitPrice}
                        onChange={(e) => update(line.key, { unitPrice: e.target.value })}
                        required
                      />
                    </div>
                    <p className="ml-auto pb-2 text-sm font-semibold tabular-nums">
                      {formatMoney(Math.round(toNumber(line.quantity) * toNumber(line.unitPrice) * 100), currency)}
                    </p>
                  </div>
                  {short && (
                    <p className="mt-2 text-sm text-clay">
                      Only {product.stock} available: the rest will need to be ordered.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-6 flex justify-end border-t border-line pt-5">
          <dl className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal (excl. VAT)</dt>
              <dd className="tabular-nums">{formatMoney(totals.subtotal, currency)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted">
                <label htmlFor="taxRate">VAT (%)</label>
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
              <dt>Total (incl. VAT)</dt>
              <dd className="tabular-nums">{formatMoney(totals.total, currency)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <label className="label" htmlFor="notes">
          Note for the client
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="input"
          placeholder={isQuote ? "Installation lead time, warranty, deposit required..." : "Payment terms, thank-you note..."}
          defaultValue={values.notes}
        />
      </section>

      {/* Barre d'action toujours visible : total + enregistrement */}
      <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card p-3 shadow-sm md:bottom-4">
        <p className="mr-auto pl-1 text-sm">
          <span className="text-muted">Total </span>
          <span className="font-semibold tabular-nums">{formatMoney(totals.total, currency)}</span>
        </p>
        <FormError message={state?.error} />
        <Link href={values.id ? `/app/documents/${values.id}` : "/app/documents"} className="btn btn-ghost">
          Cancel
        </Link>
        <SubmitButton pending={pending}>{values.id ? "Save" : isQuote ? "Create quote" : "Create invoice"}</SubmitButton>
      </div>
    </form>
  );
}
