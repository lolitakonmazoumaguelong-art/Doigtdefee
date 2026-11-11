import type { Client, Doc, LineItem, Org } from "@/db/schema";
import { computeTotals, formatDate, formatMoney, lineTotal, typeLabel } from "@/lib/format";

/** La feuille du devis ou de la facture, aux couleurs de l'entreprise. */
export function DocumentSheet({ org, doc, client, items }: { org: Org; doc: Doc; client: Client; items: LineItem[] }) {
  const totals = computeTotals(items, doc.taxRate);
  const isQuote = doc.type === "devis";
  const money = (cents: number) => formatMoney(cents, org.currency);
  const accent = /^#[0-9a-f]{6}$/i.test(org.accentColor) ? org.accentColor : "#17201d";

  return (
    <article className="card mx-auto max-w-3xl overflow-hidden print:max-w-none print:rounded-none print:border-0">
      <div className="h-2 print:h-1.5" style={{ backgroundColor: accent, printColorAdjust: "exact" }} />
      <div className="p-6 sm:p-10 print:px-0 print:py-6">
        <div className="flex flex-wrap justify-between gap-6">
          <div className="text-sm">
            {org.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logo} alt={org.name} className="mb-3 max-h-20 max-w-52 object-contain" />
            ) : null}
            <p className={org.logo ? "text-base font-semibold" : "font-display text-3xl leading-none"}>{org.name}</p>
            {org.address && <p className="mt-2 whitespace-pre-line text-muted">{org.address}</p>}
            <p className="text-muted">{[org.phone, org.email].filter(Boolean).join(" · ")}</p>
            {org.legalId && <p className="text-muted">BRN: {org.legalId}</p>}
            {org.vatNumber && <p className="text-muted">VAT: {org.vatNumber}</p>}
          </div>
          <div className="text-right text-sm">
            <p className="font-display text-4xl leading-none" style={{ color: accent }}>
              {typeLabel(doc.type)}
            </p>
            <p className="mt-3 font-medium tabular-nums">{doc.number}</p>
            <p className="text-muted">Date: {formatDate(doc.issueDate)}</p>
            {doc.dueDate && (
              <p className="text-muted">
                {isQuote ? "Valid until" : "Due by"} {formatDate(doc.dueDate)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-paper/70 p-4 text-sm print:bg-transparent print:p-0">
          <p className="label">Client</p>
          <p className="font-medium">{client.name}</p>
          {client.address && <p className="whitespace-pre-line text-muted">{client.address}</p>}
          <p className="text-muted">{[client.phone, client.email].filter(Boolean).join(" · ")}</p>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b-2 text-left text-xs tracking-wide text-muted uppercase" style={{ borderColor: accent }}>
              <th className="py-2 pr-3 font-medium">Description</th>
              <th className="hidden px-3 py-2 text-right font-medium sm:table-cell print:table-cell">Qty</th>
              <th className="hidden px-3 py-2 text-right font-medium sm:table-cell print:table-cell">Unit price</th>
              <th className="py-2 pl-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-line align-top">
                <td className="py-2.5 pr-3">
                  {item.description}
                  <span className="block text-xs text-muted tabular-nums sm:hidden print:hidden">
                    {item.quantity} × {money(item.unitPrice)}
                  </span>
                </td>
                <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell print:table-cell">{item.quantity}</td>
                <td className="hidden px-3 py-2.5 text-right whitespace-nowrap tabular-nums sm:table-cell print:table-cell">
                  {money(item.unitPrice)}
                </td>
                <td className="py-2.5 pl-3 text-right whitespace-nowrap tabular-nums">
                  {money(lineTotal(item.quantity, item.unitPrice))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal (excl. VAT)</dt>
              <dd className="tabular-nums">{money(totals.subtotal)}</dd>
            </div>
            {doc.taxRate > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">VAT ({doc.taxRate}%)</dt>
                <dd className="tabular-nums">{money(totals.tax)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t-2 pt-2 text-base font-semibold" style={{ borderColor: accent }}>
              <dt>{doc.taxRate > 0 ? "Total (incl. VAT)" : "Total"}</dt>
              <dd className="tabular-nums">{money(totals.total)}</dd>
            </div>
          </dl>
        </div>

        {doc.notes && <p className="mt-8 text-sm whitespace-pre-line">{doc.notes}</p>}
        {org.footerNote && (
          <p className="mt-8 border-t border-line pt-4 text-xs whitespace-pre-line text-muted">{org.footerNote}</p>
        )}
      </div>
    </article>
  );
}
