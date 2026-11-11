import "server-only";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { isOverdue, lineTotal, today } from "@/lib/format";
import { getStockOverview } from "@/lib/stock";

export type Period = "mois" | "precedent" | "annee";
export type Insight = { tone: "good" | "bad" | "info"; text: string };

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const MONTH_LONG = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

function lastMonths(count: number) {
  const [y, m] = today().split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1));
    return { key: d.toISOString().slice(0, 7), label: MONTH.format(d).replace(".", ""), long: MONTH_LONG.format(d) };
  });
}

export async function getStats(orgId: string, period: Period) {
  const db = await getDb();
  const d = schema.documents;

  const [docs, lines, interventions, defects, stock] = await Promise.all([
    db
      .select({ id: d.id, type: d.type, status: d.status, issueDate: d.issueDate, dueDate: d.dueDate, total: d.total, subtotal: d.subtotal })
      .from(d)
      .where(and(eq(d.orgId, orgId), ne(d.status, "brouillon"))),
    db
      .select({
        issueDate: d.issueDate,
        productId: schema.lineItems.productId,
        description: schema.lineItems.description,
        quantity: schema.lineItems.quantity,
        unitPrice: schema.lineItems.unitPrice,
        productName: schema.products.name,
        costPrice: schema.products.costPrice,
      })
      .from(schema.lineItems)
      .innerJoin(d, eq(d.id, schema.lineItems.documentId))
      .leftJoin(schema.products, eq(schema.products.id, schema.lineItems.productId))
      .where(and(eq(d.orgId, orgId), eq(d.type, "facture"), inArray(d.status, ["envoye", "paye"]))),
    db
      .select({
        id: schema.interventions.id,
        title: schema.interventions.title,
        status: schema.interventions.status,
        feedback: schema.interventions.feedback,
        issue: schema.interventions.issue,
        scheduledDate: schema.interventions.scheduledDate,
        clientName: schema.clients.name,
      })
      .from(schema.interventions)
      .innerJoin(schema.clients, eq(schema.clients.id, schema.interventions.clientId))
      .where(eq(schema.interventions.orgId, orgId))
      .orderBy(desc(schema.interventions.scheduledDate)),
    db
      .select({ name: schema.products.name, delta: schema.stockMovements.delta })
      .from(schema.stockMovements)
      .innerJoin(schema.products, eq(schema.products.id, schema.stockMovements.productId))
      .where(and(eq(schema.stockMovements.orgId, orgId), eq(schema.stockMovements.reason, "defaut"))),
    getStockOverview(orgId),
  ]);

  // --- Chiffre d'affaires facturé par mois (factures émises ou payées)
  const invoices = docs.filter((doc) => doc.type === "facture");
  const months = lastMonths(12).map((month) => {
    const ofMonth = invoices.filter((i) => i.issueDate.startsWith(month.key));
    return { ...month, invoiced: ofMonth.reduce((s, i) => s + i.total, 0), count: ofMonth.length };
  });
  const current = months[11];
  const previous = months[10];
  const change = previous.invoiced > 0 ? ((current.invoiced - previous.invoiced) / previous.invoiced) * 100 : null;

  // --- Best sellers sur la période choisie
  const keys = period === "mois" ? [current.key] : period === "precedent" ? [previous.key] : months.map((m) => m.key);
  const sales = new Map<string, { name: string; quantity: number; revenue: number; margin: number | null }>();
  for (const line of lines) {
    if (!keys.includes(line.issueDate.slice(0, 7))) continue;
    const key = line.productId ?? `libre:${line.description}`;
    const row = sales.get(key) ?? { name: line.productName ?? line.description, quantity: 0, revenue: 0, margin: line.productId ? 0 : null };
    row.quantity += line.quantity;
    row.revenue += lineTotal(line.quantity, line.unitPrice);
    if (row.margin !== null && line.costPrice !== null) row.margin += lineTotal(line.quantity, line.unitPrice - line.costPrice);
    sales.set(key, row);
  }
  const top = [...sales.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  const periodRevenue = [...sales.values()].reduce((s, r) => s + r.revenue, 0);
  const periodMargin = [...sales.values()].reduce((s, r) => s + (r.margin ?? 0), 0);

  // --- Devis
  const quotes = docs.filter((doc) => doc.type === "devis");
  const accepted = quotes.filter((q) => q.status === "accepte").length;
  const refused = quotes.filter((q) => q.status === "refuse").length;
  const acceptance = accepted + refused > 0 ? Math.round((accepted / (accepted + refused)) * 100) : null;

  // --- Encaissements
  const unpaid = invoices.filter((i) => i.status === "envoye");
  const overdue = unpaid.filter(isOverdue);
  const overdueAmount = overdue.reduce((s, i) => s + i.total, 0);

  // --- Satisfaction et difficultés
  const rated = interventions.filter((i) => i.feedback !== "");
  const satisfaction = {
    bon: rated.filter((i) => i.feedback === "bon").length,
    moyen: rated.filter((i) => i.feedback === "moyen").length,
    mauvais: rated.filter((i) => i.feedback === "mauvais").length,
  };
  const issues = interventions.filter((i) => i.issue !== "").slice(0, 8);

  const defectMap = new Map<string, number>();
  for (const row of defects) defectMap.set(row.name, (defectMap.get(row.name) ?? 0) - row.delta);
  const defective = [...defectMap.entries()].map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity).slice(0, 6);

  const toOrder = stock.filter((p) => p.toOrder > 0).length;

  // --- Ce qu'il faut retenir, en clair
  const insights: Insight[] = [];
  if (change !== null) {
    insights.push(
      change >= 0
        ? { tone: "good", text: `Invoiced revenue is up ${Math.round(change)}% compared with last month.` }
        : { tone: "bad", text: `Invoiced revenue is down ${Math.round(-change)}% compared with last month.` },
    );
  } else if (current.invoiced > 0) {
    insights.push({ tone: "info", text: "First month with invoices: the comparison starts next month." });
  }
  if (top[0]) insights.push({ tone: "info", text: `Best seller for the period: ${top[0].name}.` });
  if (overdue.length) insights.push({ tone: "bad", text: `${overdue.length} invoice(s) overdue: remember to chase them.` });
  if (acceptance !== null && accepted + refused >= 3) {
    insights.push(
      acceptance >= 50
        ? { tone: "good", text: `${acceptance}% of answered quotes are accepted.` }
        : { tone: "bad", text: `Only ${acceptance}% of quotes are accepted: review your prices or follow up sooner.` },
    );
  }
  if (satisfaction.mauvais) insights.push({ tone: "bad", text: `${satisfaction.mauvais} job(s) with an unhappy client: read the issues below.` });
  if (defective[0]?.quantity >= 2) insights.push({ tone: "bad", text: `${defective[0].name} is often returned as faulty (${defective[0].quantity}): raise it with the supplier.` });
  if (toOrder) insights.push({ tone: "info", text: `${toOrder} item(s) to order to avoid running out.` });

  return {
    months,
    current,
    previous,
    change,
    top,
    periodRevenue,
    periodMargin,
    acceptance,
    quoteCounts: { accepted, refused, waiting: quotes.filter((q) => q.status === "envoye").length },
    unpaidAmount: unpaid.reduce((s, i) => s + i.total, 0),
    overdueAmount,
    satisfaction,
    ratedCount: rated.length,
    issues,
    defective,
    insights,
  };
}
