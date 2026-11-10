import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listClients } from "@/lib/queries";

export const metadata = { title: "Clients" };

export default async function ClientsPage() {
  const { org } = await requireSession();
  const clients = await listClients(org.id);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="page-title">Clients</h1>
        <Link href="/app/clients/nouveau" className="btn btn-primary">
          Ajouter un client
        </Link>
      </header>

      {clients.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-display text-2xl">Aucun client pour l&apos;instant</p>
          <p className="mt-2 text-sm text-muted">Ajoute ton premier client pour lui préparer un devis.</p>
        </div>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {clients.map((client) => (
            <li key={client.id}>
              <Link
                href={`/app/clients/${client.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-paper/60 sm:px-5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{client.name}</p>
                  <p className="truncate text-sm text-muted">
                    {[client.phone, client.email].filter(Boolean).join(" · ") || "Pas de contact renseigné"}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-muted">
                  <p>{client.kind === "entreprise" ? "Entreprise" : "Particulier"}</p>
                  <p>
                    {client.docCount} document{client.docCount > 1 ? "s" : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
