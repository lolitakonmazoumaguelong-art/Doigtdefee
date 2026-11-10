import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { getStats, type Period } from "@/lib/stats";

export const metadata = { title: "Statistiques" };

const PERIODS: { id: Period; label: string }[] = [
  { id: "mois", label: "Ce mois" },
  { id: "precedent", label: "Mois dernier" },
  { id: "annee", label: "12 mois" },
];

// Couleurs d'avis validées (daltonisme compris) ; toujours accompagnées d'un libellé et d'un nombre
const FEEDBACK = [
  { id: "bon", label: "Satisfaits", color: "#12824a" },
  { id: "moyen", label: "Mitigés", color: "#cf9a00" },
  { id: "mauvais", label: "Mécontents", color: "#d1362a" },
] as const;

const TONE_DOT = { good: "bg-moss", bad: "bg-clay", info: "bg-ink/40" };

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const { org, user } = await requireSession();
  if (user.role !== "owner") {
    return (
      <div className="space-y-4">
        <h1 className="page-title">Statistiques</h1>
        <p className="card max-w-xl p-5 text-sm text-muted">Les chiffres de l&apos;entreprise sont réservés au responsable du compte.</p>
      </div>
    );
  }

  const param = (await searchParams).periode;
  const period: Period = param === "precedent" || param === "annee" ? param : "mois";
  const stats = await getStats(org.id, period);
  const money = (cents: number) => formatMoney(cents, org.currency);
  const compact = (cents: number) =>
    new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(cents / 100);

  const maxMonth = Math.max(...stats.months.map((m) => m.invoiced), 1);
  const maxTop = Math.max(...stats.top.map((t) => t.revenue), 1);
  const periodLabel = period === "mois" ? stats.current.long : period === "precedent" ? stats.previous.long : "12 derniers mois";

  const tiles = [
    {
      label: `Facturé en ${stats.current.long}`,
      value: money(stats.current.invoiced),
      hint:
        stats.change === null
          ? `${stats.current.count} facture(s)`
          : `${stats.change >= 0 ? "▲ +" : "▼ −"}${Math.abs(Math.round(stats.change))} % vs mois dernier`,
      tone: stats.change === null ? "" : stats.change >= 0 ? "text-moss" : "text-clay",
    },
    { label: "Mois dernier", value: money(stats.previous.invoiced), hint: `${stats.previous.count} facture(s)`, tone: "" },
    {
      label: "Reste à encaisser",
      value: money(stats.unpaidAmount),
      hint: stats.overdueAmount ? `dont ${money(stats.overdueAmount)} en retard` : "Aucun retard",
      tone: stats.overdueAmount ? "text-clay" : "",
    },
    {
      label: "Devis acceptés",
      value: stats.acceptance === null ? "Aucune réponse" : `${stats.acceptance} %`,
      hint: `${stats.quoteCounts.accepted} acceptés · ${stats.quoteCounts.refused} refusés · ${stats.quoteCounts.waiting} en attente`,
      tone: "",
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="page-title">Statistiques</h1>
        <p className="mt-2 text-sm text-muted">Comment va {org.name}, en un coup d&apos;oeil.</p>
      </header>

      {stats.insights.length > 0 && (
        <section className="rounded-2xl border border-ink/15 bg-chalk/35 p-5 sm:p-6">
          <h2 className="font-display text-2xl">Ce qu&apos;il faut retenir</h2>
          <ul className="mt-3 space-y-2">
            {stats.insights.map((insight) => (
              <li key={insight.text} className="flex items-start gap-3 text-sm">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${TONE_DOT[insight.tone]}`} />
                {insight.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="card p-4 sm:p-5">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">{tile.label}</p>
            <p className="mt-2 text-lg font-semibold tabular-nums sm:text-2xl">{tile.value}</p>
            <p className={`mt-1 text-xs ${tile.tone || "text-muted"}`}>{tile.hint}</p>
          </div>
        ))}
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-2xl">Chiffre d&apos;affaires facturé par mois</h2>
        <p className="mt-1 text-sm text-muted">Factures émises ou payées, toutes taxes comprises, sur 12 mois.</p>
        <div className="mt-6 flex h-52 items-end gap-0.5 border-b border-line sm:gap-2">
          {stats.months.map((month, index) => {
            const isCurrent = index === stats.months.length - 1;
            const height = month.invoiced > 0 ? Math.max((month.invoiced / maxMonth) * 100, 2) : 0;
            return (
              <div key={month.key} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end" tabIndex={0}>
                <span className="pointer-events-none absolute -top-2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full rounded-md bg-ink px-2 py-1 text-xs whitespace-nowrap text-paper group-hover:block group-focus:block">
                  {month.long} : {money(month.invoiced)} · {month.count} facture(s)
                </span>
                {(isCurrent || month.invoiced === maxMonth) && month.invoiced > 0 && (
                  <span className="mb-1 text-center text-[11px] font-medium tabular-nums">{compact(month.invoiced)}</span>
                )}
                <div
                  className={`mx-auto w-full max-w-10 rounded-t ${isCurrent ? "bg-ink" : "bg-ink/35"} group-hover:bg-moss`}
                  style={{ height: `${height}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-0.5 sm:gap-2">
          {stats.months.map((month, index) => (
            <span key={month.key} className={`min-w-0 flex-1 truncate text-center text-[11px] ${index === 11 ? "font-medium text-ink" : "text-muted"}`}>
              {month.label}
            </span>
          ))}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Meilleures ventes</h2>
            <p className="mt-1 text-sm text-muted">
              {periodLabel} · {money(stats.periodRevenue)} HT vendus, marge estimée {money(stats.periodMargin)}
            </p>
          </div>
          <nav className="flex gap-1">
            {PERIODS.map((p) => (
              <Link
                key={p.id}
                href={`/app/statistiques?periode=${p.id}`}
                scroll={false}
                className={`rounded-full px-3 py-1.5 text-sm whitespace-nowrap ${period === p.id ? "bg-ink text-paper" : "text-muted hover:bg-ink/5"}`}
              >
                {p.label}
              </Link>
            ))}
          </nav>
        </div>
        {stats.top.length === 0 ? (
          <p className="mt-5 text-sm text-muted">Aucune vente facturée sur cette période.</p>
        ) : (
          <table className="mt-5 w-full text-sm">
            <thead>
              <tr className="text-left text-xs tracking-wide text-muted uppercase">
                <th className="pb-2 font-medium">Article</th>
                <th className="pb-2 pl-3 text-right font-medium">Qté</th>
                <th className="pb-2 pl-3 text-right font-medium">Ventes HT</th>
                <th className="hidden pb-2 pl-3 text-right font-medium sm:table-cell">Marge</th>
              </tr>
            </thead>
            <tbody>
              {stats.top.map((row) => (
                <tr key={row.name} className="border-t border-line align-top">
                  <td className="py-2.5">
                    <span className="block">{row.name}</span>
                    <span className="mt-1.5 block h-2 rounded-r bg-ink" style={{ width: `${Math.max((row.revenue / maxTop) * 100, 1.5)}%` }} />
                  </td>
                  <td className="py-2.5 pl-3 text-right tabular-nums">{row.quantity}</td>
                  <td className="py-2.5 pl-3 text-right whitespace-nowrap tabular-nums">{money(row.revenue)}</td>
                  <td className="hidden py-2.5 pl-3 text-right whitespace-nowrap text-muted tabular-nums sm:table-cell">
                    {row.margin === null ? "n/c" : money(row.margin)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <h2 className="font-display text-2xl">Avis des clients</h2>
          {stats.ratedCount === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Pas encore d&apos;avis. Renseigne le bilan à la fin de chaque intervention pour suivre la satisfaction.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">Sur {stats.ratedCount} intervention(s) notée(s).</p>
              <div className="mt-4 flex h-4 gap-0.5 overflow-hidden rounded-full">
                {FEEDBACK.filter((f) => stats.satisfaction[f.id] > 0).map((f) => (
                  <span key={f.id} style={{ backgroundColor: f.color, flexGrow: stats.satisfaction[f.id] }} title={`${f.label} : ${stats.satisfaction[f.id]}`} />
                ))}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {FEEDBACK.map((f) => (
                  <li key={f.id} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                    {f.label} : <span className="font-semibold tabular-nums">{stats.satisfaction[f.id]}</span>
                    <span className="text-muted">({Math.round((stats.satisfaction[f.id] / stats.ratedCount) * 100)} %)</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="font-display text-2xl">Produits à problèmes</h2>
          {stats.defective.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Aucun produit défectueux signalé. Utilise « Défectueux / retour SAV » sur la fiche d&apos;un article pour les suivre.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {stats.defective.map((row) => (
                <li key={row.name} className="flex justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">{row.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{row.quantity} défectueux</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-2xl">Difficultés rencontrées sur le terrain</h2>
        {stats.issues.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Rien de signalé pour l&apos;instant.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {stats.issues.map((issue) => (
              <li key={issue.id} className="py-3 text-sm">
                <Link href={`/app/interventions/${issue.id}`} className="font-medium underline-offset-4 hover:underline">
                  {issue.title}
                </Link>
                <span className="text-muted">
                  {" "}
                  · {issue.clientName} · {formatDate(issue.scheduledDate)}
                </span>
                <p className="mt-0.5 whitespace-pre-line text-muted">{issue.issue}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
