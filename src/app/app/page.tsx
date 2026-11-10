import Link from "next/link";
import { DocList } from "@/components/doc-row";
import { InterventionList } from "@/components/intervention-list";
import { requireSession } from "@/lib/auth";
import { formatMoney, isOverdue } from "@/lib/format";
import { listClients, listDocuments, listInterventions } from "@/lib/queries";
import { getStockOverview } from "@/lib/stock";

export const metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const { user, org } = await requireSession();
  const [docs, clients, products, interventions] = await Promise.all([
    listDocuments(org.id),
    listClients(org.id),
    getStockOverview(org.id),
    listInterventions(org.id),
  ]);

  const sum = (list: typeof docs) => list.reduce((s, d) => s + d.total, 0);
  const invoices = docs.filter((d) => d.type === "facture");
  const paid = invoices.filter((d) => d.status === "paye");
  const pending = invoices.filter((d) => d.status === "envoye");
  const overdue = pending.filter(isOverdue);
  const openQuotes = docs.filter((d) => d.type === "devis" && d.status === "envoye");
  const lowStock = products.filter((p) => p.toOrder > 0);
  const upcoming = interventions.filter((i) => i.status === "planifiee" || i.status === "en_cours").slice(0, 5);

  const stats = [
    { label: "Encaissé", value: sum(paid), hint: `${paid.length} facture(s) payée(s)` },
    {
      label: "À encaisser",
      value: sum(pending),
      hint: overdue.length ? `dont ${overdue.length} en retard` : `${pending.length} facture(s) en attente`,
      alert: overdue.length > 0,
    },
    { label: "Devis en cours", value: sum(openQuotes), hint: `${openQuotes.length} devis sans réponse` },
  ];

  const isNew = docs.length === 0 && products.length === 0 && clients.length === 0;
  const steps = [
    {
      done: !!org.address || !!org.phone,
      title: "Complète la fiche de l'entreprise",
      text: "Adresse, téléphone et mentions apparaissent sur chaque document.",
      href: "/app/parametres",
      cta: "Ouvrir les paramètres",
    },
    {
      done: products.length > 0,
      title: "Ajoute ton matériel",
      text: "Caméras, enregistreurs, câbles, forfaits de pose.",
      href: "/app/stock/nouveau",
      cta: "Ajouter un article",
    },
    {
      done: clients.length > 0,
      title: "Ajoute ton premier client",
      text: "Tu retrouveras tout son historique sur sa fiche.",
      href: "/app/clients/nouveau",
      cta: "Ajouter un client",
    },
    {
      done: docs.length > 0,
      title: "Prépare ton premier devis",
      text: "Une fois accepté, il devient une facture en un clic.",
      href: "/app/documents/nouveau?type=devis",
      cta: "Créer un devis",
    },
  ];
  const showSteps = steps.some((s) => !s.done);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Bonjour {user.name.split(" ")[0]}</p>
          <h1 className="page-title mt-1">{org.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/interventions/nouveau" className="btn btn-ghost">
            Planifier une intervention
          </Link>
          <Link href="/app/documents/nouveau?type=devis" className="btn btn-primary">
            Nouveau devis
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`card p-4 sm:p-5 ${stat.alert ? "border-clay/40" : ""}`}>
            <p className="text-xs font-medium tracking-wide text-muted uppercase">{stat.label}</p>
            <p className="mt-2 text-lg font-semibold tabular-nums sm:text-2xl">{formatMoney(stat.value, org.currency)}</p>
            <p className={`mt-1 text-xs ${stat.alert ? "text-clay" : "text-muted"}`}>{stat.hint}</p>
          </div>
        ))}
        <Link
          href="/app/stock/reappro"
          className={`card p-4 transition-colors hover:bg-paper/60 sm:p-5 ${lowStock.length ? "border-clay/40" : ""}`}
        >
          <p className="text-xs font-medium tracking-wide text-muted uppercase">À commander</p>
          <p className={`mt-2 text-lg font-semibold tabular-nums sm:text-2xl ${lowStock.length ? "text-clay" : ""}`}>
            {lowStock.length} article{lowStock.length > 1 ? "s" : ""}
          </p>
          <p className="mt-1 truncate text-xs text-muted">
            {lowStock.length ? lowStock.slice(0, 2).map((p) => p.name).join(", ") : "Rien à commander pour le moment"}
          </p>
        </Link>
      </section>

      {showSteps && (
        <section className="card p-6 sm:p-8">
          <h2 className="font-display text-3xl">{isNew ? "Bienvenue ! Quatre étapes pour démarrer" : "Pour finir la mise en route"}</h2>
          <ol className="mt-5 space-y-4">
            {steps.map((step, i) => (
              <li key={step.title} className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                    step.done ? "bg-moss text-paper" : "bg-chalk text-ink"
                  }`}
                >
                  {step.done ? "✓" : i + 1}
                </span>
                <div className="min-w-0 flex-1 basis-48">
                  <p className={`text-sm font-medium ${step.done ? "text-muted line-through" : ""}`}>{step.title}</p>
                  <p className="text-sm text-muted">{step.text}</p>
                </div>
                {!step.done && (
                  <Link href={step.href} className="btn btn-ghost">
                    {step.cta}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl">Prochaines interventions</h2>
            <Link href="/app/interventions" className="text-sm text-muted underline underline-offset-4 hover:text-ink">
              Tout voir
            </Link>
          </div>
          <InterventionList rows={upcoming} />
        </section>
      )}

      {docs.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl">Derniers documents</h2>
            <Link href="/app/documents" className="text-sm text-muted underline underline-offset-4 hover:text-ink">
              Tout voir
            </Link>
          </div>
          <DocList docs={docs.slice(0, 6)} currency={org.currency} />
        </section>
      )}
    </div>
  );
}
