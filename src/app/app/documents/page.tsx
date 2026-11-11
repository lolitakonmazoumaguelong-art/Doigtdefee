import Link from "next/link";
import { DocList } from "@/components/doc-row";
import { requireSession } from "@/lib/auth";
import { listDocuments } from "@/lib/queries";

export const metadata = { title: "Quotes & invoices" };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { org } = await requireSession();
  const param = (await searchParams).type;
  const type = param === "devis" || param === "facture" ? param : undefined;
  const docs = await listDocuments(org.id, { type });

  const tabs = [
    { id: undefined, label: "All" },
    { id: "devis", label: "Quote" },
    { id: "facture", label: "Invoices" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="page-title">Quotes & invoices</h1>
        <div className="flex gap-2">
          <Link href="/app/documents/new?type=facture" className="btn btn-ghost">
            New invoice
          </Link>
          <Link href="/app/documents/new?type=devis" className="btn btn-primary">
            New quote
          </Link>
        </div>
      </header>

      <nav className="flex gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.id ? `/app/documents?type=${tab.id}` : "/app/documents"}
            className={`rounded-full px-3 py-1.5 text-sm ${type === tab.id ? "bg-ink text-paper" : "text-muted hover:bg-ink/5"}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {docs.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-display text-2xl">Nothing here yet</p>
          <p className="mt-2 text-sm text-muted">
            Prepare a quote from your catalogue. Once accepted, it becomes an invoice in one click.
          </p>
        </div>
      ) : (
        <DocList docs={docs} currency={org.currency} />
      )}
    </div>
  );
}
