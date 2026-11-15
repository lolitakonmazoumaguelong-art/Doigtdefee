"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireSession } from "@/lib/auth";
import { addMonths, parseAmount } from "@/lib/format";
import type { FormState } from "@/lib/types";

const contractSchema = z.object({
  id: z.uuid().optional(),
  clientId: z.uuid("Choose a client."),
  title: z.string().trim().min(1, "Give the contract a title.").max(200),
  startDate: z.iso.date("Invalid start date."),
  endDate: z.union([z.literal(""), z.iso.date("Invalid end date.")], "Invalid end date."),
  nextVisit: z.union([z.literal(""), z.iso.date("Invalid next visit date.")], "Invalid next visit date."),
  intervalMonths: z.coerce.number("Invalid visit frequency.").int().min(1).max(60),
  price: z.number("Invalid amount.").int("Invalid amount.").min(0, "Invalid amount.").max(2_000_000_000, "Invalid amount."),
  notes: z.string().trim().max(2000),
  status: z.enum(["actif", "termine"]),
});

export async function saveContract(_prev: FormState, formData: FormData): Promise<FormState> {
  const { org } = await requireSession();
  const parsed = contractSchema.safeParse({
    id: formData.get("id") || undefined,
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") ?? "",
    nextVisit: formData.get("nextVisit") ?? "",
    intervalMonths: formData.get("intervalMonths") || "6",
    price: parseAmount(formData.get("price") || "0"),
    notes: formData.get("notes") ?? "",
    status: formData.get("status") ?? "actif",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const db = await getDb();
  const { id, ...data } = parsed.data;
  const [client] = await db
    .select({ id: schema.clients.id })
    .from(schema.clients)
    .where(and(eq(schema.clients.id, data.clientId), eq(schema.clients.orgId, org.id)));
  if (!client) return { error: "Client not found." };

  const values = {
    ...data,
    endDate: data.endDate || null,
    // Sans date saisie, la première visite tombe une période après le début
    nextVisit: data.nextVisit || addMonths(data.startDate, data.intervalMonths),
  };
  if (id) {
    await db.update(schema.contracts).set(values).where(and(eq(schema.contracts.id, id), eq(schema.contracts.orgId, org.id)));
  } else {
    await db.insert(schema.contracts).values({ ...values, orgId: org.id });
  }
  revalidatePath("/app", "layout");
  redirect(`/app/clients/${data.clientId}`);
}

/** Crée l'intervention de maintenance prévue et décale l'échéance à la période suivante. */
export async function scheduleContractVisit(formData: FormData) {
  const { org, user } = await requireSession();
  const id = z.uuid().parse(formData.get("id"));
  const db = await getDb();
  let jobId = "";
  await db.transaction(async (tx) => {
    const [contract] = await tx
      .select()
      .from(schema.contracts)
      .where(and(eq(schema.contracts.id, id), eq(schema.contracts.orgId, org.id)));
    if (!contract || !contract.nextVisit) return;
    const [job] = await tx
      .insert(schema.interventions)
      .values({
        orgId: org.id,
        clientId: contract.clientId,
        title: `Maintenance: ${contract.title}`.slice(0, 200),
        type: "maintenance",
        scheduledDate: contract.nextVisit,
        technician: user.name,
        notes: contract.notes,
      })
      .returning({ id: schema.interventions.id });
    jobId = job.id;
    await tx
      .update(schema.contracts)
      .set({ nextVisit: addMonths(contract.nextVisit, contract.intervalMonths) })
      .where(eq(schema.contracts.id, id));
  });
  revalidatePath("/app", "layout");
  if (jobId) redirect(`/app/interventions/${jobId}`);
}

export async function deleteContract(formData: FormData) {
  const { org, user } = await requireSession();
  if (user.role !== "owner") return;
  const id = z.uuid().parse(formData.get("id"));
  const clientId = z.uuid().parse(formData.get("clientId"));
  const db = await getDb();
  await db.delete(schema.contracts).where(and(eq(schema.contracts.id, id), eq(schema.contracts.orgId, org.id)));
  revalidatePath("/app", "layout");
  redirect(`/app/clients/${clientId}`);
}
