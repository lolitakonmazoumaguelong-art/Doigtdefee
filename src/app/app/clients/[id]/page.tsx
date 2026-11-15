import Link from "next/link";
import { notFound } from "next/navigation";
import { scheduleContractVisit } from "@/actions/contracts";
import { InterventionList } from "@/components/intervention-list";
import { Badge } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { formatDate, formatMoney, statusInfo, today, typeLabel } from "@/lib/format";
import { getClient, listContracts, listDocuments, listInstalledEquipment, listInterventions } from "@/lib/queries";

export const metadata = { title: "Client file" };

const paidFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Indian/Mauritius" });

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { org } = await requireSession();
  const client = await getClient(org.id, (await params).id);
  if (!client) notFound();

  const [docs, interventions, contracts, equipment] = await Promise.all([
    listDocuments(org.id, { clientId: client.id }),
    listInterventions(org.id, client.id),
    listContracts(org.id, client.id),
    listInstalledEquipment(org.id, client.id),
  ]);
  const money = (cents: number) => formatMoney(cents, org.currency);
  const invoices = docs.filter((d) => d.type === "facture" && d.status !== "brouillon");
  const quotes = docs.filter((d) => d.type === "devis");
  const billed = invoices.reduce((s, d) => s + d.total, 0);
  const paid = invoices.filter((d) => d.status === "paye").reduce((s, d) => s + d.total, 0);
  const due = billed - paid;
  const now = today();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/app/clients" className="text-sm text-muted underline-offset-4 hover:underline">
            Clients
          </Link>
          <h1 className="page-title mt-1">{client.name}</h1>
          <p className="mt-2 text-sm text-muted">{client.kind === "entreprise" ? "Company" : "Individual"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/app/clients/${client.id}/edit`} className="btn btn-ghost">
            Edit
          </Link>
          <Link href={`/app/interventions/new?client=${client.id}`} className="btn btn-ghost">
            Schedule a job
          </Link>
          <Link href={`/app/documents/new?type=devis&client=${client.id}`} className="btn btn-primary">
            New quote
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card col-span-2 space-y-1 p-5 text-sm lg:col-span-1">
          <p className="label">Contact details</p>
          {client.phone && (
            <p>
              <a href={`tel:${client.phone}`} className="underline underline-offset-4">
                {client.phone}
              </a>
            </p>
          )}
          {client.email && (
            <p className="truncate">
              <a href={`mailto:${client.email}`} className="underline underline-offset-4">
                {client.email}
              </a>
            </p>
          )}
          {client.address && <p className="whitespace-pre-line text-muted">{client.address}</p>}
          {!client.phone && !client.email && !client.address && <p className="text-muted">Nothing filled in.</p>}
        </div>
        <div className="card p-5">
          <p className="label">Total invoiced</p>
          <p className="text-xl font-semibold tabular-nums sm:text-2xl">{money(billed)}</p>
        </div>
        <div className="card p-5">
          <p className="label">Paid</p>
          <p className="text-xl font-semibold tabular-nums sm:text-2xl">{money(paid)}</p>
        </div>
        <div className={`card p-5 ${due > 0 ? "border-clay/40" : ""}`}>
          <p className="label">Outstanding</p>
          <p className={`text-xl font-semibold tabular-nums sm:text-2xl ${due > 0 ? "text-clay" : ""}`}>{money(due)}</p>
        </div>
      </section>

      {client.notes && (
        <section className="card p-5">
          <p className="label">Internal notes</p>
          <p className="text-sm whitespace-pre-line">{client.notes}</p>
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Maintenance contracts</h2>
          <Link href={`/app/contracts/new?client=${client.id}`} className="btn btn-ghost">
            + Add a contract
          </Link>
        </div>
        {contracts.length === 0 ? (
          <p className="card p-5 text-sm text-muted">No maintenance contract. Add one to get reminded of the visits.</p>
        ) : (
          <ul className="card divide-y divide-line">
            {contracts.map(({ contract }) => {
              const active = contract.status === "actif";
              const late = active && !!contract.nextVisit && contract.nextVisit < now;
              return (
                <li key={contract.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1 basis-56">
                    <Link href={`/app/contracts/${contract.id}`} className="text-sm font-medium underline-offset-4 hover:underline">
                      {contract.title}
                    </Link>
                    <p className="text-sm text-muted">
                      Since {formatDate(contract.startDate)}
                      {contract.price > 0 && ` · ${money(contract.price)} / year`}
                      {active && contract.nextVisit && ` · next visit ${formatDate(contract.nextVisit)}`}
                    </p>
                  </div>
                  <Badge label={!active ? "Ended" : late ? "Visit overdue" : "Active"} tone={!active ? "neutral" : late ? "bad" : "good"} />
                  {active && contract.nextVisit && (
                    <form action={scheduleContractVisit}>
                      <input type="hidden" name="id" value={contract.id} />
                      <button className="btn btn-ghost">Schedule the visit</button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl">Equipment installed</h2>
        {equipment.length === 0 ? (
          <p className="card p-5 text-sm text-muted">Nothing yet. Equipment appears here once it has been invoiced to this client.</p>
        ) : (
          <ul className="card divide-y divide-line">
            {equipment.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-4 py-2.5 text-sm sm:px-5">
                <span className="w-10 shrink-0 font-semibold tabular-nums">{item.quantity} ×</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{item.description}</span>
                  {item.reference && <span className="block truncate text-xs text-muted">Ref. {item.reference}</span>}
                </span>
                <Link href={`/app/documents/${item.documentId}`} className="shrink-0 text-right text-xs text-muted underline-offset-4 hover:underline">
                  {formatDate(item.issueDate)}
                  <span className="block tabular-nums">{item.number}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl">Jobs history</h2>
        {interventions.length ? (
          <InterventionList rows={[...interventions].reverse()} showClient={false} />
        ) : (
          <p className="card p-5 text-sm text-muted">No jobs for this client.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl">Invoices and payments</h2>
        {invoices.length === 0 ? (
          <p className="card p-5 text-sm text-muted">No invoice issued yet.</p>
        ) : (
          <ul className="card divide-y divide-line">
            {invoices.map((doc) => {
              const status = statusInfo(doc);
              return (
                <li key={doc.id}>
                  <Link href={`/app/documents/${doc.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-paper/60 sm:px-5">
                    <span className="w-32 text-sm font-medium tabular-nums">{doc.number}</span>
                    <span className="min-w-0 flex-1 text-sm text-muted">
                      Issued {formatDate(doc.issueDate)}
                      {doc.status === "paye"
                        ? ` · paid ${doc.paidAt ? paidFormat.format(doc.paidAt) : ""}`
                        : doc.dueDate
                          ? ` · due ${formatDate(doc.dueDate)}`
                          : ""}
                    </span>
                    <Badge {...status} />
                    <span className="w-28 text-right text-sm font-medium tabular-nums">{money(doc.total)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {quotes.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-2xl">Quotes</h2>
          <ul className="card divide-y divide-line">
            {quotes.map((doc) => (
              <li key={doc.id}>
                <Link href={`/app/documents/${doc.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-paper/60 sm:px-5">
                  <span className="w-32 text-sm font-medium tabular-nums">{doc.number}</span>
                  <span className="min-w-0 flex-1 text-sm text-muted">
                    {typeLabel(doc.type)} of {formatDate(doc.issueDate)}
                  </span>
                  <Badge {...statusInfo(doc)} />
                  <span className="w-28 text-right text-sm font-medium tabular-nums">{money(doc.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
