"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema, type DB } from "@/db";
import { requireSession } from "@/lib/auth";
import { PAYMENT_METHODS } from "@/lib/catalog";
import { parseAmount, today } from "@/lib/format";
import type { FormState } from "@/lib/types";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

const paymentSchema = z.object({
  documentId: z.uuid(),
  amount: z.number("Invalid amount.").int("Invalid amount.").positive("The amount must be greater than zero."),
  paidOn: z.iso.date("Invalid payment date."),
  method: z.enum(PAYMENT_METHODS.map((m) => m.id) as [string, ...string[]]),
  note: z.string().trim().max(200),
});

/** Recalcule le statut de la facture d'après la somme de ses paiements. */
async function syncInvoiceStatus(tx: Tx, documentId: string, total: number) {
  const [row] = await tx
    .select({ paid: sql<number>`coalesce(sum(${schema.payments.amount}), 0)`.mapWith(Number) })
    .from(schema.payments)
    .where(eq(schema.payments.documentId, documentId));
  const settled = (row?.paid ?? 0) >= total;
  await tx
    .update(schema.documents)
    .set({ status: settled ? "paye" : "envoye", paidAt: settled ? new Date() : null })
    .where(eq(schema.documents.id, documentId));
}

export async function addPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const { org } = await requireSession();
  const parsed = paymentSchema.safeParse({
    documentId: formData.get("documentId"),
    amount: parseAmount(formData.get("amount")),
    paidOn: formData.get("paidOn") || today(),
    method: formData.get("method") ?? "cash",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { documentId, ...payment } = parsed.data;

  const db = await getDb();
  try {
    await db.transaction(async (tx) => {
      const [doc] = await tx
        .select({ type: schema.documents.type, status: schema.documents.status, total: schema.documents.total })
        .from(schema.documents)
        .where(and(eq(schema.documents.id, documentId), eq(schema.documents.orgId, org.id)));
      if (!doc || doc.type !== "facture") throw new Error("Invoice not found.");
      if (doc.status !== "envoye") throw new Error("Payments can only be recorded on an issued, unpaid invoice.");
      const [row] = await tx
        .select({ paid: sql<number>`coalesce(sum(${schema.payments.amount}), 0)`.mapWith(Number) })
        .from(schema.payments)
        .where(eq(schema.payments.documentId, documentId));
      if (payment.amount > doc.total - (row?.paid ?? 0)) throw new Error("This amount is more than the balance due.");
      await tx.insert(schema.payments).values({ ...payment, orgId: org.id, documentId });
      await syncInvoiceStatus(tx, documentId, doc.total);
    });
  } catch (e) {
    return { error: e instanceof Error && e.message.endsWith(".") ? e.message : "Could not record the payment, please try again." };
  }
  revalidatePath("/app", "layout");
  return { ok: true };
}

/** Annuler un paiement saisi par erreur : réservé au responsable. */
export async function deletePayment(formData: FormData) {
  const { org, user } = await requireSession();
  if (user.role !== "owner") return;
  const id = z.uuid().parse(formData.get("id"));
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [payment] = await tx
      .select({ documentId: schema.payments.documentId, total: schema.documents.total })
      .from(schema.payments)
      .innerJoin(schema.documents, eq(schema.documents.id, schema.payments.documentId))
      .where(and(eq(schema.payments.id, id), eq(schema.payments.orgId, org.id)));
    if (!payment) return;
    await tx.delete(schema.payments).where(eq(schema.payments.id, id));
    await syncInvoiceStatus(tx, payment.documentId, payment.total);
  });
  revalidatePath("/app", "layout");
}
