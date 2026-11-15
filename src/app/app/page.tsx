import Link from "next/link";
import { scheduleContractVisit } from "@/actions/contracts";
import { InterventionList } from "@/components/intervention-list";
import { StockBar } from "@/components/stock-bar";
import { Badge } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { addDays, formatDate, formatMoney, isOverdue, today } from "@/lib/format";
import { listClients, listContracts, listDocuments, listInterventions } from "@/lib/queries";
import { getStockOverview } from "@/lib/stock";

export const metadata = { title: "Dashboard" };

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

export default async function DashboardPage() {
  const { user, org } = await requireSession();
  const isOwner = user.role === "owner";
  const [docs, clients, products, interventions, contracts] = await Promise.all([
    listDocuments(org.id),
    listClients(org.id),
    getStockOverview(org.id),
    listInterventions(org.id),
    listContracts(org.id),
  ]);
  const money = (cents: number) => formatMoney(cents, org.currency);
  const now = today();

  // --- Chiffre d'affaires facturé, 6 derniers mois
  const invoices = docs.filter((d) => d.type === "facture" && d.status !== "brouillon");
  const [year, month] = now.split("-").map(Number);
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 1 - (5 - i), 1));
    const key = date.toISOString().slice(0, 7);
    return { key, label: MONTH.format(date), total: invoices.filter((d) => d.issueDate.startsWith(key)).reduce((s, d) => s + d.total, 0) };
  });
  const current = months[5].total;
  const previous = months[4].total;
  const change = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
  const maxMonth = Math.max(...months.map((m) => m.total), 1);

  // --- Impayés, devis en attente, stock, planning
  const unpaid = invoices
    .filter((d) => d.status === "envoye")
    .map((d) => ({ ...d, balance: d.total - d.paid, overdue: isOverdue(d) }))
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const unpaidTotal = unpaid.reduce((s, d) => s + d.balance, 0);
  const overdueCount = unpaid.filter((d) => d.overdue).length;
  const openQuotes = docs.filter((d) => d.type === "devis" && d.status === "envoye");
  const lowStock = products.filter((p) => p.toOrder > 0).sort((a, b) => a.available - b.available);
  const openJobs = interventions.filter((i) => i.status === "planifiee" || i.status === "en_cours");
  const todayJobs = openJobs.filter((i) => i.scheduledDate === now);
  const nextJobs = openJobs.filter((i) => i.scheduledDate >= now).slice(0, 5);
  const lateJobs = openJobs.filter((i) => i.scheduledDate < now);
  const maintenanceDue = contracts.filter(
    ({ contract }) => contract.status === "actif" && !!contract.nextVisit && contract.nextVisit <= addDays(now, 30),
  );

  const steps = [
    { done: !!org.address || !!org.phone, title: "Complete your company details", href: "/app/settings", cta: "Open settings" },
    { done: products.length > 0, title: "Add your equipment", href: "/app/stock/import", cta: "Import a list" },
    { done: clients.length > 0, title: "Add your first client", href: "/app/clients/new", cta: "Add a client" },
    { done: docs.length > 0, title: "Prepare your first quote", href: "/app/documents/new?type=devis", cta: "Create a quote" },
  ];

  const tiles = [
    ...(isOwner
      ? [
          {
            label: "Revenue this month",
            value: money(current),
            hint: change === null ? "Invoiced, incl. VAT" : `${change >= 0 ? "▲ +" : "▼ −"}${Math.abs(change)}% vs last month`,
            tone: change === null ? "" : change >= 0 ? "text-moss" : "text-clay",
            href: "/app/statistics",
          },
        ]
      : []),
    {
      label: "Unpaid invoices",
      value: money(unpaidTotal),
      hint: overdueCount ? `${unpaid.length} invoice(s), ${overdueCount} overdue` : `${unpaid.length} invoice(s) awaiting payment`,
      tone: overdueCount ? "text-clay" : "",
      href: "/app/documents?type=facture",
    },
    {
      label: "Quotes awaiting reply",
      value: String(openQuotes.length),
      hint: openQuotes.length ? `Worth ${money(openQuotes.reduce((s, d) => s + d.total, 0))}` : "Nothing pending",
      tone: "",
      href: "/app/documents?type=devis",
    },
    {
      label: "Low stock",
      value: `${lowStock.length} item${lowStock.length === 1 ? "" : "s"}`,
      hint: lowStock.length ? "Tap to see what to order" : "All above their thresholds",
      tone: lowStock.length ? "text-clay" : "",
      href: "/app/stock/reorder",
    },
    ...(isOwner
      ? []
      : [
          {
            label: "Jobs today",
            value: String(todayJobs.length),
            hint: lateJobs.length ? `${lateJobs.length} late job(s) to update` : "On your schedule",
            tone: lateJobs.length ? "text-clay" : "",
            href: "/app/interventions",
          },
        ]),
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Hello {user.name.split(" ")[0]}</p>
          <h1 className="page-title mt-1">{org.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/interventions/new" className="btn btn-ghost">
            Schedule a job
          </Link>
          <Link href="/app/documents/new?type=facture" className="btn btn-ghost">
            New invoice
          </Link>
          <Link href="/app/documents/new?type=devis" className="btn btn-primary">
            New quote
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className="card p-4 transition-colors hover:bg-paper/60 sm:p-5">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">{tile.label}</p>
            <p className="mt-2 text-lg font-semibold tabular-nums sm:text-2xl">{tile.value}</p>
            <p className={`mt-1 text-xs ${tile.tone || "text-muted"}`}>{tile.hint}</p>
          </Link>
        ))}
      </section>

      {steps.some((s) => !s.done) && (
        <section className="card p-5 sm:p-6">
          <h2 className="font-display text-2xl">Finish setting up</h2>
          <ol className="mt-4 space-y-3">
            {steps.map((step, i) => (
              <li key={step.title} className="flex flex-wrap items-center gap-3">
                <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${step.done ? "bg-moss text-paper" : "bg-chalk text-ink"}`}>
                  {step.done ? "✓" : i + 1}
                </span>
                <p className={`min-w-0 flex-1 basis-40 text-sm ${step.done ? "text-muted line-through" : "font-medium"}`}>{step.title}</p>
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

      <div className="grid gap-4 lg:grid-cols-2">
        {isOwner && (
          <section className="card p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl">Revenue, last 6 months</h2>
              <Link href="/app/statistics" className="text-sm text-muted underline underline-offset-4 hover:text-ink">
                Statistics
              </Link>
            </div>
            <div className="mt-5 flex h-36 items-end gap-2 border-b border-line">
              {months.map((m, index) => (
                <div key={m.key} className="group relative flex h-full flex-1 flex-col justify-end" tabIndex={0}>
                  <span className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full rounded-md bg-ink px-2 py-1 text-xs whitespace-nowrap text-paper group-hover:block group-focus:block">
                    {money(m.total)}
                  </span>
                  <div
                    className={`mx-auto w-full max-w-12 rounded-t ${index === 5 ? "bg-ink" : "bg-ink/35"} group-hover:bg-moss`}
                    style={{ height: `${m.total > 0 ? Math.max((m.total / maxMonth) * 100, 3) : 0}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-2">
              {months.map((m, index) => (
                <span key={m.key} className={`flex-1 text-center text-[11px] ${index === 5 ? "font-medium" : "text-muted"}`}>
                  {m.label}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="card p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl">Unpaid invoices</h2>
            <Link href="/app/documents?type=facture" className="text-sm text-muted underline underline-offset-4 hover:text-ink">
              View all
            </Link>
          </div>
          {unpaid.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nothing to collect. Every issued invoice is paid.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {unpaid.slice(0, 5).map((doc) => (
                <li key={doc.id}>
                  <Link href={`/app/documents/${doc.id}`} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{doc.clientName}</span>
                      <span className="block text-xs text-muted tabular-nums">
                        {doc.number}
                        {doc.dueDate && ` · due ${formatDate(doc.dueDate)}`}
                      </span>
                    </span>
                    {doc.overdue && <Badge label="Overdue" tone="bad" />}
                    <span className="shrink-0 font-semibold tabular-nums">{money(doc.balance)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl">Low stock</h2>
            <Link href="/app/stock/reorder" className="text-sm text-muted underline underline-offset-4 hover:text-ink">
              To order
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="mt-4 text-sm text-muted">All items are above their alert threshold.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {lowStock.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <Link href={`/app/stock/${p.id}`} className="block text-sm">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="truncate font-medium">{p.name}</span>
                      <span className={`shrink-0 tabular-nums ${p.available <= 0 ? "font-semibold text-clay" : "text-muted"}`}>
                        {p.available <= 0 ? "Out of stock" : `${p.available} left`} · order {p.toOrder}
                      </span>
                    </span>
                    <span className="mt-1.5 block">
                      <StockBar available={p.available} min={p.minStock} target={p.targetStock} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl">Maintenance due</h2>
            <span className="text-sm text-muted">Next 30 days</span>
          </div>
          {maintenanceDue.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No maintenance visit due. Contracts are added from a client file.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {maintenanceDue.slice(0, 5).map(({ contract, clientName }) => (
                <li key={contract.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <Link href={`/app/clients/${contract.clientId}`} className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{clientName}</span>
                    <span className={`block text-xs ${contract.nextVisit! < now ? "text-clay" : "text-muted"}`}>
                      {contract.title} · {contract.nextVisit! < now ? "was due" : "due"} {formatDate(contract.nextVisit)}
                    </span>
                  </Link>
                  <form action={scheduleContractVisit}>
                    <input type="hidden" name="id" value={contract.id} />
                    <button className="btn btn-ghost">Schedule</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl">
            Upcoming jobs {todayJobs.length > 0 && <span className="text-muted">· {todayJobs.length} today</span>}
          </h2>
          <Link href="/app/interventions?view=calendar" className="text-sm text-muted underline underline-offset-4 hover:text-ink">
            Calendar
          </Link>
        </div>
        {lateJobs.length > 0 && (
          <p className="mb-3 rounded-lg border border-clay/30 bg-clay/10 px-3 py-2 text-sm text-clay">
            {lateJobs.length} job(s) from past days are still open. Mark them completed or reschedule them.
          </p>
        )}
        {nextJobs.length ? (
          <InterventionList rows={nextJobs} />
        ) : (
          <p className="card p-5 text-sm text-muted">Nothing scheduled.</p>
        )}
      </section>
    </div>
  );
}
