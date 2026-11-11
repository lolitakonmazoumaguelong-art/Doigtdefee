import Link from "next/link";
import { notFound } from "next/navigation";
import { convertToInvoice, deleteDocument, setStatus } from "@/actions/documents";
import { Badge, ConfirmButton, PrintButton } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { DocumentSheet } from "@/components/document-sheet";
import { ShareButtons } from "@/components/share-buttons";
import { isDocEditable, statusInfo, typeLabel } from "@/lib/format";
import { getDocument } from "@/lib/queries";

export const metadata = { title: "Document" };

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
  const { org } = await requireSession();
  const data = await getDocument(org.id, (await params).id);
  if (!data) notFound();
  const { doc, client, items } = data;

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
          <PrintButton />
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
          {!isQuote && doc.status === "envoye" && (
            <StatusButton id={doc.id} status="paye" label="Mark as paid" className="btn btn-accent" />
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
      />

      <DocumentSheet org={org} doc={doc} client={client} items={items} />

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
    </div>
  );
}
