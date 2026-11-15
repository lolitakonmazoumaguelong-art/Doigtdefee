import { asc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSession } from "@/lib/auth";
import { categoryLabel, interventionStatus, interventionTypeLabel, paymentMethodLabel } from "@/lib/catalog";
import { statusInfo, typeLabel } from "@/lib/format";
import { listClients, listContracts, listDocuments, listInterventions } from "@/lib/queries";
import { getStockOverview } from "@/lib/stock";

type Cell = string | number | null | undefined;

/** CSV lisible par Excel : séparateur virgule, BOM UTF-8, cellules protégées contre les formules. */
function toCsv(rows: Cell[][]) {
  const cell = (value: Cell) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "number") return String(value);
    const text = /^[=+\-@\t]/.test(value) ? `'${value}` : value;
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return "﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}

const amount = (cents: number) => cents / 100;

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const session = await getSession();
  if (!session) return new Response("Please log in.", { status: 401 });
  // Sortir les données de l'entreprise est réservé au responsable
  if (session.user.role !== "owner") return new Response("Only the account owner can export data.", { status: 403 });
  const { org } = session;
  const { kind } = await params;
  const stamp = new Date().toISOString().slice(0, 10);
  const file = (body: string, name: string, type: string) =>
    new Response(body, {
      headers: {
        "Content-Type": `${type}; charset=utf-8`,
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "private, no-store",
      },
    });
  const csv = (rows: Cell[][], name: string) => file(toCsv(rows), `${name}-${stamp}.csv`, "text/csv");

  if (kind === "clients") {
    const clients = await listClients(org.id);
    return csv(
      [["Name", "Type", "Phone", "Email", "Address", "Documents"], ...clients.map((c) => [c.name, c.kind === "entreprise" ? "Company" : "Individual", c.phone, c.email, c.address, c.docCount])],
      "clients",
    );
  }
  if (kind === "stock") {
    const products = await getStockOverview(org.id);
    return csv(
      [
        ["Name", "Category", "Reference", "Supplier", "Selling price", "Cost price", "In stock", "Reserved", "Available", "On order", "Alert threshold", "Sold in 30 days", "Suggested order", "Status"],
        ...products.map((p) => [p.name, categoryLabel(p.category), p.reference, p.supplier, amount(p.unitPrice), amount(p.costPrice), p.kind === "service" ? "" : p.stock, p.reserved, p.available, p.onOrder, p.minStock, p.sold30, p.toOrder, p.archived ? "Discontinued" : p.kind === "service" ? "Service" : "Active"]),
      ],
      "stock",
    );
  }
  if (kind === "documents") {
    const docs = await listDocuments(org.id);
    return csv(
      [
        ["Number", "Type", "Client", "Date", "Due date", "Status", "Total", "Paid", "Balance"],
        ...docs.map((d) => [d.number, typeLabel(d.type), d.clientName, d.issueDate, d.dueDate, statusInfo(d).label, amount(d.total), d.type === "facture" ? amount(d.paid) : "", d.type === "facture" && d.status !== "brouillon" ? amount(d.total - d.paid) : ""]),
      ],
      "quotes-invoices",
    );
  }
  if (kind === "payments") {
    const db = await getDb();
    const rows = await db
      .select({ payment: schema.payments, number: schema.documents.number, client: schema.clients.name })
      .from(schema.payments)
      .innerJoin(schema.documents, eq(schema.documents.id, schema.payments.documentId))
      .innerJoin(schema.clients, eq(schema.clients.id, schema.documents.clientId))
      .where(eq(schema.payments.orgId, org.id))
      .orderBy(asc(schema.payments.paidOn));
    return csv(
      [["Date", "Invoice", "Client", "Method", "Amount", "Note"], ...rows.map((r) => [r.payment.paidOn, r.number, r.client, paymentMethodLabel(r.payment.method), amount(r.payment.amount), r.payment.note])],
      "payments",
    );
  }
  if (kind === "jobs") {
    const jobs = await listInterventions(org.id);
    return csv(
      [["Date", "Time", "Title", "Type", "Client", "Technician", "Status"], ...jobs.map((j) => [j.scheduledDate, j.scheduledTime, j.title, interventionTypeLabel(j.type), j.clientName, j.technician, interventionStatus(j.status).label])],
      "jobs",
    );
  }
  if (kind === "backup") {
    // Sauvegarde complète de l'entreprise, sans les mots de passe
    const db = await getDb();
    const byOrg = <T extends { orgId: unknown }>(table: T) => eq(table.orgId as never, org.id);
    const [users, clients, products, movements, documents, payments, interventions, contracts, orders, messages] = await Promise.all([
      db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role }).from(schema.users).where(byOrg(schema.users)),
      db.select().from(schema.clients).where(byOrg(schema.clients)),
      db.select().from(schema.products).where(byOrg(schema.products)),
      db.select().from(schema.stockMovements).where(byOrg(schema.stockMovements)),
      db.select().from(schema.documents).where(byOrg(schema.documents)),
      db.select().from(schema.payments).where(byOrg(schema.payments)),
      db.select().from(schema.interventions).where(byOrg(schema.interventions)),
      listContracts(org.id).then((rows) => rows.map((r) => r.contract)),
      db.select().from(schema.purchaseOrders).where(byOrg(schema.purchaseOrders)),
      db.select().from(schema.messages).where(byOrg(schema.messages)),
    ]);
    const lineItems = documents.length
      ? await db.select().from(schema.lineItems).where(inArray(schema.lineItems.documentId, documents.map((d) => d.id)))
      : [];
    const purchaseItems = orders.length
      ? await db.select().from(schema.purchaseItems).where(inArray(schema.purchaseItems.orderId, orders.map((o) => o.id)))
      : [];
    const backup = {
      format: "doigt-de-fee-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      company: org,
      users,
      clients,
      products,
      stockMovements: movements,
      // Le jeton du lien de partage reste hors de la sauvegarde
      documents: documents.map((doc) => ({ ...doc, shareToken: undefined })),
      lineItems,
      payments,
      interventions,
      contracts,
      purchaseOrders: orders,
      purchaseItems,
      messages,
    };
    return file(JSON.stringify(backup, null, 1), `doigt-de-fee-backup-${stamp}.json`, "application/json");
  }
  return new Response("Not found.", { status: 404 });
}
