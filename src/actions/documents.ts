"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNotNull, max, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema, type DB } from "@/db";
import type { DocStatus, DocType } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { addDays, computeTotals, isDocEditable, today } from "@/lib/format";
import type { FormState } from "@/lib/types";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

const itemSchema = z.object({
  productId: z.union([z.uuid(), z.literal(""), z.null()]).optional(),
  description: z.string().trim().min(1, "Chaque ligne doit avoir une désignation.").max(500),
  quantity: z.coerce.number("Quantité invalide.").positive("La quantité doit être positive.").max(1_000_000),
  unitPrice: z.coerce.number("Prix invalide.").min(0, "Le prix ne peut pas être négatif.").max(10_000_000),
});

const docSchema = z.object({
  id: z.uuid().optional(),
  type: z.enum(["devis", "facture"]),
  clientId: z.uuid("Choisis un client."),
  issueDate: z.iso.date("Date d'émission invalide."),
  dueDate: z.union([z.literal(""), z.iso.date("Date d'échéance invalide.")]),
  taxRate: z.coerce.number("Taux de TVA invalide.").min(0).max(100),
  notes: z.string().trim().max(2000),
  items: z.array(itemSchema).min(1, "Ajoute au moins une ligne.").max(100),
});

async function nextNumber(tx: Tx, orgId: string, type: DocType, year: number) {
  const [row] = await tx
    .select({ last: max(schema.documents.seq) })
    .from(schema.documents)
    .where(and(eq(schema.documents.orgId, orgId), eq(schema.documents.type, type), eq(schema.documents.year, year)));
  const seq = (row?.last ?? 0) + 1;
  const prefix = type === "devis" ? "D" : "F";
  return { seq, number: `${prefix}-${year}-${String(seq).padStart(3, "0")}` };
}

/** Sort (-1) ou remet (+1) en stock les articles d'une facture. */
async function applyStock(tx: Tx, orgId: string, doc: { id: string; number: string }, direction: -1 | 1) {
  const lines = await tx
    .select({ productId: schema.lineItems.productId, quantity: schema.lineItems.quantity })
    .from(schema.lineItems)
    .innerJoin(schema.products, eq(schema.products.id, schema.lineItems.productId))
    .where(
      and(
        eq(schema.lineItems.documentId, doc.id),
        isNotNull(schema.lineItems.productId),
        eq(schema.products.kind, "produit"),
        eq(schema.products.orgId, orgId),
      ),
    );
  for (const line of lines) {
    const delta = direction * Math.ceil(line.quantity);
    await tx
      .update(schema.products)
      .set({ stock: sql`${schema.products.stock} + ${delta}` })
      .where(eq(schema.products.id, line.productId!));
    await tx.insert(schema.stockMovements).values({
      orgId,
      productId: line.productId!,
      delta,
      reason: direction === -1 ? "facture" : "annulation",
      note: `Facture ${doc.number}`,
    });
  }
}

export async function saveDocument(_prev: FormState, formData: FormData): Promise<FormState> {
  const { org } = await requireSession();

  let rawItems: unknown;
  try {
    rawItems = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "Lignes invalides." };
  }
  const parsed = docSchema.safeParse({
    id: formData.get("id") || undefined,
    type: formData.get("type"),
    clientId: formData.get("clientId"),
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate") ?? "",
    taxRate: String(formData.get("taxRate") ?? "0").replace(",", "."),
    notes: formData.get("notes") ?? "",
    items: rawItems,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const db = await getDb();
  const { id, items, ...data } = parsed.data;

  const [client] = await db
    .select({ id: schema.clients.id })
    .from(schema.clients)
    .where(and(eq(schema.clients.id, data.clientId), eq(schema.clients.orgId, org.id)));
  if (!client) return { error: "Client introuvable." };

  // On ne garde que les articles qui appartiennent bien à cette entreprise
  const wantedIds = [...new Set(items.map((i) => i.productId).filter((v): v is string => !!v))];
  const owned = wantedIds.length
    ? await db
        .select({ id: schema.products.id })
        .from(schema.products)
        .where(and(inArray(schema.products.id, wantedIds), eq(schema.products.orgId, org.id)))
    : [];
  const ownedIds = new Set(owned.map((p) => p.id));

  const rows = items.map((item, position) => ({
    position,
    productId: item.productId && ownedIds.has(item.productId) ? item.productId : null,
    description: item.description,
    quantity: item.quantity,
    unitPrice: Math.round(item.unitPrice * 100),
  }));
  const { subtotal, total } = computeTotals(rows, data.taxRate);
  if (total > 2_000_000_000) return { error: "Montant total trop élevé." };

  const values = {
    clientId: data.clientId,
    issueDate: data.issueDate,
    dueDate: data.dueDate || null,
    taxRate: data.taxRate,
    notes: data.notes,
    subtotal,
    total,
  };

  let docId = id;
  try {
    await db.transaction(async (tx) => {
      if (id) {
        const [existing] = await tx
          .select({ status: schema.documents.status, type: schema.documents.type })
          .from(schema.documents)
          .where(and(eq(schema.documents.id, id), eq(schema.documents.orgId, org.id)));
        if (!existing) throw new Error("Document introuvable.");
        if (!isDocEditable(existing)) throw new Error("Ce document est verrouillé et ne peut plus être modifié.");
        await tx.update(schema.documents).set(values).where(eq(schema.documents.id, id));
        await tx.delete(schema.lineItems).where(eq(schema.lineItems.documentId, id));
      } else {
        const year = Number(data.issueDate.slice(0, 4));
        const { seq, number } = await nextNumber(tx, org.id, data.type, year);
        const [created] = await tx
          .insert(schema.documents)
          .values({ ...values, orgId: org.id, type: data.type, year, seq, number })
          .returning({ id: schema.documents.id });
        docId = created.id;
      }
      await tx.insert(schema.lineItems).values(rows.map((r) => ({ ...r, documentId: docId! })));
    });
  } catch (e) {
    return { error: e instanceof Error && e.message.endsWith(".") ? e.message : "Enregistrement impossible, réessaie." };
  }

  revalidatePath("/app", "layout");
  redirect(`/app/documents/${docId}`);
}

// Une facture émise ne repasse jamais en brouillon : son stock est déjà sorti.
const ALLOWED: Record<DocType, DocStatus[]> = {
  devis: ["brouillon", "envoye", "accepte", "refuse"],
  facture: ["envoye", "paye"],
};

export async function setStatus(formData: FormData) {
  const { org } = await requireSession();
  const id = z.uuid().parse(formData.get("id"));
  const status = z.enum(["brouillon", "envoye", "accepte", "refuse", "paye"]).parse(formData.get("status"));

  const db = await getDb();
  await db.transaction(async (tx) => {
    const [doc] = await tx
      .select()
      .from(schema.documents)
      .where(and(eq(schema.documents.id, id), eq(schema.documents.orgId, org.id)));
    if (!doc || !ALLOWED[doc.type].includes(status)) return;

    const applyNow = doc.type === "facture" && !doc.stockApplied;
    if (applyNow) await applyStock(tx, org.id, doc, -1);
    await tx
      .update(schema.documents)
      .set({ status, stockApplied: doc.stockApplied || applyNow })
      .where(eq(schema.documents.id, id));
  });
  revalidatePath("/app", "layout");
}

export async function convertToInvoice(formData: FormData) {
  const { org } = await requireSession();
  const id = z.uuid().parse(formData.get("id"));
  const db = await getDb();

  const [quote] = await db
    .select()
    .from(schema.documents)
    .where(and(eq(schema.documents.id, id), eq(schema.documents.orgId, org.id), eq(schema.documents.type, "devis")));
  if (!quote) return;
  const items = await db.select().from(schema.lineItems).where(eq(schema.lineItems.documentId, id));

  const issueDate = today();
  const year = Number(issueDate.slice(0, 4));
  let invoiceId = "";
  await db.transaction(async (tx) => {
    const { seq, number } = await nextNumber(tx, org.id, "facture", year);
    const [created] = await tx
      .insert(schema.documents)
      .values({
        orgId: org.id,
        clientId: quote.clientId,
        type: "facture",
        year,
        seq,
        number,
        issueDate,
        dueDate: addDays(issueDate, 30),
        taxRate: quote.taxRate,
        subtotal: quote.subtotal,
        total: quote.total,
        notes: quote.notes,
        sourceId: quote.id,
      })
      .returning({ id: schema.documents.id });
    invoiceId = created.id;
    if (items.length) {
      await tx.insert(schema.lineItems).values(
        items.map((i) => ({
          documentId: created.id,
          productId: i.productId,
          position: i.position,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      );
    }
    await tx.update(schema.documents).set({ status: "accepte" }).where(eq(schema.documents.id, quote.id));
  });

  revalidatePath("/app", "layout");
  redirect(`/app/documents/${invoiceId}`);
}

export async function deleteDocument(formData: FormData) {
  const { org } = await requireSession();
  const id = z.uuid().parse(formData.get("id"));
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [doc] = await tx
      .select()
      .from(schema.documents)
      .where(and(eq(schema.documents.id, id), eq(schema.documents.orgId, org.id)));
    if (!doc) return;
    // Facture déjà émise : on remet les articles en stock avant de supprimer
    if (doc.stockApplied) await applyStock(tx, org.id, doc, 1);
    await tx.delete(schema.documents).where(eq(schema.documents.id, id));
  });
  revalidatePath("/app", "layout");
  redirect("/app/documents");
}
