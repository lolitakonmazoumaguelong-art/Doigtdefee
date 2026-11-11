import Link from "next/link";
import { DocList } from "@/components/doc-row";
import { InterventionList } from "@/components/intervention-list";
import { requireSession } from "@/lib/auth";
import { formatMoney, isOverdue } from "@/lib/format";
import { listClients, listDocuments, listInterventions } from "@/lib/queries";
import { getStockOverview } from "@/lib/stock";

export const metadata = { title: "Dashboard" };

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
    { label: "Collected", value: sum(paid), hint: `${paid.length} paid invoice(s)` },
    {
      label: "To collect",
      value: sum(pending),
      hint: overdue.length ? `incl. ${overdue.length} overdue` : `${pending.length} unpaid invoice(s)`,
      alert: overdue.length > 0,
    },
    { label: "Open quotes", value: sum(openQuotes), hint: `${openQuotes.length} quote(s) awaiting a reply` },
  ];

  const isNew = docs.length === 0 && products.length === 0 && clients.length === 0;
  const steps = [
    {
      done: !!org.address || !!org.phone,
      title: "Complete your company details",
      text: "Address, phone and footer notes appear on every document.",
      href: "/app/settings",
      cta: "Open settings",
    },
    {
      done: products.length > 0,
      title: "Add your equipment",
      text: "Cameras, recorders, cables, installation packages.",
      href: "/app/stock/new",
      cta: "Add an item",
    },
    {
      done: clients.length > 0,
      title: "Add your first client",
      text: "You will find their full history on their file.",
      href: "/app/clients/new",
      cta: "Add a client",
    },
    {
      done: docs.length > 0,
      title: "Prepare your first quote",
      text: "Once accepted, it becomes an invoice in one click.",
      href: "/app/documents/new?type=devis",
      cta: "Create a quote",
    },
  ];
  const showSteps = steps.some((s) => !s.done);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Hello {user.name.split(" ")[0]}</p>
          <h1 className="page-title mt-1">{org.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/interventions/new" className="btn btn-ghost">
            Schedule a job
          </Link>
          <Link href="/app/documents/new?type=devis" className="btn btn-primary">
            New quote
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
          href="/app/stock/reorder"
          className={`card p-4 transition-colors hover:bg-paper/60 sm:p-5 ${lowStock.length ? "border-clay/40" : ""}`}
        >
          <p className="text-xs font-medium tracking-wide text-muted uppercase">To order</p>
          <p className={`mt-2 text-lg font-semibold tabular-nums sm:text-2xl ${lowStock.length ? "text-clay" : ""}`}>
            {lowStock.length} item{lowStock.length === 1 ? "" : "s"}
          </p>
          <p className="mt-1 truncate text-xs text-muted">
            {lowStock.length ? lowStock.slice(0, 2).map((p) => p.name).join(", ") : "Nothing to order right now"}
          </p>
        </Link>
      </section>

      {showSteps && (
        <section className="card p-6 sm:p-8">
          <h2 className="font-display text-3xl">{isNew ? "Welcome! Four steps to get started" : "Finish setting up"}</h2>
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
            <h2 className="font-display text-2xl">Upcoming jobs</h2>
            <Link href="/app/interventions" className="text-sm text-muted underline underline-offset-4 hover:text-ink">
              View all
            </Link>
          </div>
          <InterventionList rows={upcoming} />
        </section>
      )}

      {docs.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl">Latest documents</h2>
            <Link href="/app/documents" className="text-sm text-muted underline underline-offset-4 hover:text-ink">
              View all
            </Link>
          </div>
          <DocList docs={docs.slice(0, 6)} currency={org.currency} />
        </section>
      )}
    </div>
  );
}
