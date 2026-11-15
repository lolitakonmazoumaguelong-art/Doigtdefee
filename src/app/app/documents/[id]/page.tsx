import Link from "next/link";
import { notFound } from "next/navigation";
import { convertToInvoice, deleteDocument, setStatus } from "@/actions/documents";
import { Badge, ConfirmButton, PrintButton } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { DocumentSheet } from "@/components/document-sheet";
import { ShareButtons } from "@/components/share-buttons";
import { PaymentForm } from "@/components/payment-form";
import { deletePayment } from "@/actions/payments";
import { paymentMethodLabel } from "@/lib/catalog";
import { formatDate, formatMoney, isDocEditable, statusInfo, today, typeLabel } from "@/lib/format";
import { getDocument } from "@/lib/queries";

export const metadata = { title: "Document" };

const isQuoteDoc = (doc: { type: string }) => doc.type === "devis";

function StatusButton({ id, status, label, className }: { id: string; status: string; label: string; className: string }) {
  return (
    <form action={setStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={className}>{label}</button>
    </form>
  );
}

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { org, user } = await requireSession();
  const data = await getDocument(org.id, (await params).id);
  if (!data) notFound();
  const { doc, client, items, payments, paid } = data;
  const balance = Math.max(doc.total - paid, 0);
  const issued = !isQuoteDoc(doc) && doc.status !== "brouillon";
  const isOwner = user.role === "owner";

  const status = statusInfo(doc);
  const isQuote = doc.type === "devis";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <Link href="/app/documents" className="text-sm text-muted underline-offset-4 hover:underline">
            Quotes & invoices
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="page-title">
              {typeLabel(doc.type)} {doc.number}
            </h1>
            <Badge {...status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isDocEditable(doc) && (
            <Link href={`/app/documents/${doc.id}/edit`} className="btn btn-ghost">
              Edit
            </Link>
          )}
          <PrintButton label="Print" />
          <a href={`/app/documents/${doc.id}/pdf`} download className="btn btn-ghost">
            Download PDF
          </a>
          {doc.status === "brouillon" && (
            <StatusButton
              id={doc.id}
              status="envoye"
              label={isQuote ? "Mark as sent" : "Issue invoice"}
              className="btn btn-accent"
            />
          )}
          {isQuote && doc.status === "envoye" && (
            <>
              <StatusButton id={doc.id} status="refuse" label="Declined" className="btn btn-ghost" />
              <StatusButton id={doc.id} status="accepte" label="Accepted" className="btn btn-accent" />
            </>
          )}
          {isQuote && (doc.status === "envoye" || doc.status === "accepte") && (
            <form action={convertToInvoice}>
              <input type="hidden" name="id" value={doc.id} />
              <button className="btn btn-primary">Convert to invoice</button>
            </form>
          )}
        </div>
      </header>

      {!isQuote && doc.status === "brouillon" && (
        <p className="rounded-lg border border-line bg-chalk/30 px-4 py-3 text-sm print:hidden">
          Draft: equipment leaves stock when you issue the invoice.
        </p>
      )}

      <ShareButtons
        token={doc.shareToken}
        label={`${typeLabel(doc.type).toLowerCase()} ${doc.number}`}
        orgName={org.name}
        clientPhone={client.phone}
        clientEmail={client.email}
        reminder={
          issued && balance > 0
            ? `Hello, a reminder that invoice ${doc.number} from ${org.name} has a balance of ${formatMoney(balance, org.currency)}${doc.dueDate ? `, due ${formatDate(doc.dueDate)}` : ""}. You can view it here:`
            : undefined
        }
      />

      {issued && (
        <section className="card mx-auto max-w-3xl p-5 print:hidden">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl">Payments</h2>
            <p className="text-sm">
              <span className="text-muted">Paid </span>
              <span className="font-semibold tabular-nums">{formatMoney(paid, org.currency)}</span>
              <span className="text-muted"> · Balance </span>
              <span className={`font-semibold tabular-nums ${balance > 0 ? "text-clay" : "text-moss"}`}>
                {formatMoney(balance, org.currency)}
              </span>
            </p>
          </div>
          {payments.length > 0 && (
            <ul className="mt-3 divide-y divide-line border-y border-line text-sm">
              {payments.map((payment) => (
                <li key={payment.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                  <span className="w-28 text-muted">{formatDate(payment.paidOn)}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {paymentMethodLabel(payment.method)}
                    {payment.note && <span className="text-muted"> · {payment.note}</span>}
                  </span>
                  <span className="font-medium tabular-nums">{formatMoney(payment.amount, org.currency)}</span>
                  {isOwner && (
                    <form action={deletePayment}>
                      <input type="hidden" name="id" value={payment.id} />
                      <ConfirmButton message="Remove this payment?" className="cursor-pointer text-xs text-muted underline underline-offset-4 hover:text-clay">
                        Remove
                      </ConfirmButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
          {balance > 0 ? (
            <div className="mt-4">
              <PaymentForm documentId={doc.id} balance={balance} today={today()} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-moss">This invoice is fully paid.</p>
          )}
        </section>
      )}

      <DocumentSheet org={org} doc={doc} client={client} items={items} paid={paid} />

      {isOwner && (
        <form action={deleteDocument} className="mx-auto max-w-3xl print:hidden">
          <input type="hidden" name="id" value={doc.id} />
          <ConfirmButton
            message={
              doc.stockApplied
                ? `Delete ${doc.number}? The invoiced equipment will go back into stock.`
                : `Delete ${doc.number}?`
            }
          >
            Delete this document
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}
