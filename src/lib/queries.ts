import "server-only";
import { and, asc, count, desc, eq, gt, ne, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { DocType } from "@/db/schema";

export const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export async function listClients(orgId: string) {
  const db = await getDb();
  return db
    .select({
      id: schema.clients.id,
      name: schema.clients.name,
      kind: schema.clients.kind,
      email: schema.clients.email,
      phone: schema.clients.phone,
      address: schema.clients.address,
      docCount: count(schema.documents.id),
    })
    .from(schema.clients)
    .leftJoin(schema.documents, eq(schema.documents.clientId, schema.clients.id))
    .where(eq(schema.clients.orgId, orgId))
    .groupBy(schema.clients.id)
    .orderBy(asc(schema.clients.name));
}

export async function getClient(orgId: string, id: string) {
  if (!isUuid(id)) return null;
  const db = await getDb();
  const [client] = await db
    .select()
    .from(schema.clients)
    .where(and(eq(schema.clients.id, id), eq(schema.clients.orgId, orgId)));
  return client ?? null;
}

/** Déjà encaissé sur un document. Une facture marquée payée sans détail compte pour son total. */
const paidAmount = sql<number>`case when ${schema.documents.status} = 'paye' then ${schema.documents.total}
  else coalesce((select sum(p.amount) from payments p where p.document_id = ${schema.documents.id}), 0) end`.mapWith(Number);

export async function listDocuments(orgId: string, filter: { type?: DocType; clientId?: string } = {}) {
  const db = await getDb();
  return db
    .select({
      id: schema.documents.id,
      type: schema.documents.type,
      status: schema.documents.status,
      number: schema.documents.number,
      issueDate: schema.documents.issueDate,
      dueDate: schema.documents.dueDate,
      total: schema.documents.total,
      paidAt: schema.documents.paidAt,
      paid: paidAmount,
      clientId: schema.documents.clientId,
      clientName: schema.clients.name,
    })
    .from(schema.documents)
    .innerJoin(schema.clients, eq(schema.clients.id, schema.documents.clientId))
    .where(
      and(
        eq(schema.documents.orgId, orgId),
        filter.type ? eq(schema.documents.type, filter.type) : undefined,
        filter.clientId ? eq(schema.documents.clientId, filter.clientId) : undefined,
      ),
    )
    .orderBy(desc(schema.documents.createdAt));
}

export async function getDocument(orgId: string, id: string) {
  if (!isUuid(id)) return null;
  const db = await getDb();
  const [row] = await db
    .select({ doc: schema.documents, client: schema.clients })
    .from(schema.documents)
    .innerJoin(schema.clients, eq(schema.clients.id, schema.documents.clientId))
    .where(and(eq(schema.documents.id, id), eq(schema.documents.orgId, orgId)));
  if (!row) return null;
  const items = await db
    .select()
    .from(schema.lineItems)
    .where(eq(schema.lineItems.documentId, id))
    .orderBy(asc(schema.lineItems.position));
  const payments = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.documentId, id))
    .orderBy(asc(schema.payments.paidOn), asc(schema.payments.createdAt));
  const recorded = payments.reduce((sum, p) => sum + p.amount, 0);
  const paid = row.doc.status === "paye" ? Math.max(recorded, row.doc.total) : recorded;
  return { ...row, items, payments, paid };
}

export async function listProducts(orgId: string) {
  const db = await getDb();
  return db
    .select()
    .from(schema.products)
    .where(eq(schema.products.orgId, orgId))
    .orderBy(asc(schema.products.category), asc(schema.products.name));
}

export async function getProduct(orgId: string, id: string) {
  if (!isUuid(id)) return null;
  const db = await getDb();
  const [product] = await db
    .select()
    .from(schema.products)
    .where(and(eq(schema.products.id, id), eq(schema.products.orgId, orgId)));
  if (!product) return null;
  const movements = await db
    .select()
    .from(schema.stockMovements)
    .where(eq(schema.stockMovements.productId, id))
    .orderBy(desc(schema.stockMovements.createdAt))
    .limit(30);
  return { product, movements };
}

export async function listInterventions(orgId: string, clientId?: string) {
  const db = await getDb();
  return db
    .select({
      id: schema.interventions.id,
      title: schema.interventions.title,
      type: schema.interventions.type,
      status: schema.interventions.status,
      scheduledDate: schema.interventions.scheduledDate,
      scheduledTime: schema.interventions.scheduledTime,
      address: schema.interventions.address,
      technician: schema.interventions.technician,
      clientId: schema.interventions.clientId,
      clientName: schema.clients.name,
    })
    .from(schema.interventions)
    .innerJoin(schema.clients, eq(schema.clients.id, schema.interventions.clientId))
    .where(and(eq(schema.interventions.orgId, orgId), clientId ? eq(schema.interventions.clientId, clientId) : undefined))
    .orderBy(asc(schema.interventions.scheduledDate), sql`${schema.interventions.scheduledTime} asc`);
}

export async function getIntervention(orgId: string, id: string) {
  if (!isUuid(id)) return null;
  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.interventions)
    .where(and(eq(schema.interventions.id, id), eq(schema.interventions.orgId, orgId)));
  return row ?? null;
}

/** Lecture publique par jeton de partage (aucune session requise). */
export async function getSharedDocument(token: string) {
  if (!/^[0-9a-f]{48}$/.test(token)) return null;
  const db = await getDb();
  const [row] = await db
    .select({ doc: schema.documents, client: schema.clients, org: schema.orgs })
    .from(schema.documents)
    .innerJoin(schema.clients, eq(schema.clients.id, schema.documents.clientId))
    .innerJoin(schema.orgs, eq(schema.orgs.id, schema.documents.orgId))
    .where(eq(schema.documents.shareToken, token));
  // Un brouillon n'est pas encore destiné au client
  if (!row || row.doc.status === "brouillon") return null;
  const items = await db
    .select()
    .from(schema.lineItems)
    .where(eq(schema.lineItems.documentId, row.doc.id))
    .orderBy(asc(schema.lineItems.position));
  const [sum] = await db
    .select({ total: sql<number>`coalesce(sum(${schema.payments.amount}), 0)`.mapWith(Number) })
    .from(schema.payments)
    .where(eq(schema.payments.documentId, row.doc.id));
  const paid = row.doc.status === "paye" ? Math.max(sum?.total ?? 0, row.doc.total) : (sum?.total ?? 0);
  return { ...row, items, paid };
}

export async function listMembers(orgId: string) {
  const db = await getDb();
  return db
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.orgId, orgId))
    .orderBy(asc(schema.users.createdAt));
}

export async function listMessages(orgId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.orgId, orgId))
    .orderBy(desc(schema.messages.createdAt))
    .limit(200);
  return rows.reverse();
}

/** Messages des collègues reçus depuis la dernière visite du fil. */
export async function countUnreadMessages(orgId: string, userId: string, since: Date) {
  const db = await getDb();
  const [row] = await db
    .select({ n: count() })
    .from(schema.messages)
    .where(and(eq(schema.messages.orgId, orgId), gt(schema.messages.createdAt, since), ne(schema.messages.userId, userId)));
  return row?.n ?? 0;
}

export async function listContracts(orgId: string, clientId?: string) {
  const db = await getDb();
  return db
    .select({ contract: schema.contracts, clientName: schema.clients.name })
    .from(schema.contracts)
    .innerJoin(schema.clients, eq(schema.clients.id, schema.contracts.clientId))
    .where(and(eq(schema.contracts.orgId, orgId), clientId ? eq(schema.contracts.clientId, clientId) : undefined))
    .orderBy(asc(schema.contracts.nextVisit));
}

export async function getContract(orgId: string, id: string) {
  if (!isUuid(id)) return null;
  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.contracts)
    .where(and(eq(schema.contracts.id, id), eq(schema.contracts.orgId, orgId)));
  return row ?? null;
}

/** Matériel facturé à un client : c'est ce qui est installé chez lui. */
export async function listInstalledEquipment(orgId: string, clientId: string) {
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.lineItems.id,
      description: schema.lineItems.description,
      quantity: schema.lineItems.quantity,
      kind: schema.products.kind,
      reference: schema.products.reference,
      issueDate: schema.documents.issueDate,
      documentId: schema.documents.id,
      number: schema.documents.number,
    })
    .from(schema.lineItems)
    .innerJoin(schema.documents, eq(schema.documents.id, schema.lineItems.documentId))
    .leftJoin(schema.products, eq(schema.products.id, schema.lineItems.productId))
    .where(
      and(
        eq(schema.documents.orgId, orgId),
        eq(schema.documents.clientId, clientId),
        eq(schema.documents.type, "facture"),
        ne(schema.documents.status, "brouillon"),
      ),
    )
    .orderBy(desc(schema.documents.issueDate));
  return rows.filter((row) => row.kind !== "service");
}

/** Journal de toutes les entrées et sorties de stock. */
export async function listStockMovements(orgId: string, limit = 200) {
  const db = await getDb();
  return db
    .select({
      id: schema.stockMovements.id,
      delta: schema.stockMovements.delta,
      reason: schema.stockMovements.reason,
      note: schema.stockMovements.note,
      createdAt: schema.stockMovements.createdAt,
      productId: schema.products.id,
      productName: schema.products.name,
    })
    .from(schema.stockMovements)
    .innerJoin(schema.products, eq(schema.products.id, schema.stockMovements.productId))
    .where(eq(schema.stockMovements.orgId, orgId))
    .orderBy(desc(schema.stockMovements.createdAt))
    .limit(limit);
}
