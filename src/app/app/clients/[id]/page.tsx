import Link from "next/link";
import { notFound } from "next/navigation";
import { DocList } from "@/components/doc-row";
import { InterventionList } from "@/components/intervention-list";
import { requireSession } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { getClient, listDocuments, listInterventions } from "@/lib/queries";

export const metadata = { title: "Fiche client" };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { org } = await requireSession();
  const client = await getClient(org.id, (await params).id);
  if (!client) notFound();

  const [docs, interventions] = await Promise.all([
    listDocuments(org.id, { clientId: client.id }),
    listInterventions(org.id, client.id),
  ]);
  const invoices = docs.filter((d) => d.type === "facture");
  const billed = invoices.filter((d) => d.status !== "brouillon").reduce((s, d) => s + d.total, 0);
  const due = invoices.filter((d) => d.status === "envoye").reduce((s, d) => s + d.total, 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/app/clients" className="text-sm text-muted underline-offset-4 hover:underline">
            Clients
          </Link>
          <h1 className="page-title mt-1">{client.name}</h1>
          <p className="mt-2 text-sm text-muted">{client.kind === "entreprise" ? "Entreprise" : "Particulier"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/app/clients/${client.id}/modifier`} className="btn btn-ghost">
            Modifier
          </Link>
          <Link href={`/app/interventions/nouveau?client=${client.id}`} className="btn btn-ghost">
            Planifier une intervention
          </Link>
          <Link href={`/app/documents/nouveau?type=devis&client=${client.id}`} className="btn btn-primary">
            Nouveau devis
          </Link>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="card space-y-1 p-5 text-sm md:col-span-1">
          <p className="label">Coordonnées</p>
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
          {!client.phone && !client.email && !client.address && <p className="text-muted">Rien de renseigné.</p>}
        </div>
        <div className="card p-5">
          <p className="label">Total facturé</p>
          <p className="text-2xl font-semibold tabular-nums">{formatMoney(billed, org.currency)}</p>
        </div>
        <div className="card p-5">
          <p className="label">Reste à encaisser</p>
          <p className={`text-2xl font-semibold tabular-nums ${due > 0 ? "text-clay" : ""}`}>
            {formatMoney(due, org.currency)}
          </p>
        </div>
      </section>

      {client.notes && (
        <section className="card p-5">
          <p className="label">Notes internes</p>
          <p className="text-sm whitespace-pre-line">{client.notes}</p>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-display text-2xl">Interventions</h2>
        {interventions.length ? (
          <InterventionList rows={interventions} showClient={false} />
        ) : (
          <p className="card p-5 text-sm text-muted">Aucune intervention pour ce client.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl">Devis et factures</h2>
        {docs.length ? (
          <DocList docs={docs} currency={org.currency} />
        ) : (
          <p className="card p-5 text-sm text-muted">Aucun document pour ce client.</p>
        )}
      </section>
    </div>
  );
}
