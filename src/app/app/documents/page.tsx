import Link from "next/link";
import { DocList } from "@/components/doc-row";
import { requireSession } from "@/lib/auth";
import { listDocuments } from "@/lib/queries";

export const metadata = { title: "Devis et factures" };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { org } = await requireSession();
  const param = (await searchParams).type;
  const type = param === "devis" || param === "facture" ? param : undefined;
  const docs = await listDocuments(org.id, { type });

  const tabs = [
    { id: undefined, label: "Tout" },
    { id: "devis", label: "Devis" },
    { id: "facture", label: "Factures" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="page-title">Devis et factures</h1>
        <div className="flex gap-2">
          <Link href="/app/documents/nouveau?type=facture" className="btn btn-ghost">
            Nouvelle facture
          </Link>
          <Link href="/app/documents/nouveau?type=devis" className="btn btn-primary">
            Nouveau devis
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
          <p className="font-display text-2xl">Rien ici pour l&apos;instant</p>
          <p className="mt-2 text-sm text-muted">
            Prépare un devis à partir de ton catalogue. Une fois accepté, il devient une facture en un clic.
          </p>
        </div>
      ) : (
        <DocList docs={docs} currency={org.currency} />
      )}
    </div>
  );
}
