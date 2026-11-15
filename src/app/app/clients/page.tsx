import Link from "next/link";
import { SearchBox, matchesQuery } from "@/components/search-box";
import { requireSession } from "@/lib/auth";
import { listClients } from "@/lib/queries";

export const metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { org } = await requireSession();
  const q = ((await searchParams).q ?? "").trim();
  const all = await listClients(org.id);
  const clients = q ? all.filter((c) => matchesQuery(q, c.name, c.phone, c.email, c.address)) : all;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="page-title">Clients</h1>
        <Link href="/app/clients/new" className="btn btn-primary">
          Add a client
        </Link>
      </header>

      {all.length > 0 && <SearchBox q={q} placeholder="Search by name, phone, email..." />}

      {clients.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-display text-2xl">{q ? `No client matches “${q}”` : "No clients yet"}</p>
          <p className="mt-2 text-sm text-muted">Add your first client to prepare a quote for them.</p>
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
                    {[client.phone, client.email].filter(Boolean).join(" · ") || "No contact details"}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-muted">
                  <p>{client.kind === "entreprise" ? "Company" : "Individual"}</p>
                  <p>
                    {client.docCount} document{client.docCount === 1 ? "" : "s"}
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
