"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireSession } from "@/lib/auth";
import type { FormState } from "@/lib/types";

const STATUSES = ["planifiee", "en_cours", "terminee", "annulee"] as const;

const interventionSchema = z.object({
  id: z.uuid().optional(),
  clientId: z.uuid("Choose a client."),
  title: z.string().trim().min(1, "Give the job a title.").max(200),
  type: z.enum(["installation", "maintenance", "depannage", "visite"]),
  status: z.enum(STATUSES),
  scheduledDate: z.iso.date("Invalid date."),
  scheduledTime: z.union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/, "Invalid time.")]),
  address: z.string().trim().max(500),
  technician: z.string().trim().max(100),
  notes: z.string().trim().max(2000),
  feedback: z.enum(["", "bon", "moyen", "mauvais"]),
  issue: z.string().trim().max(1000),
});

export async function saveIntervention(_prev: FormState, formData: FormData): Promise<FormState> {
  const { org } = await requireSession();
  const parsed = interventionSchema.safeParse({
    id: formData.get("id") || undefined,
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    type: formData.get("type"),
    status: formData.get("status") ?? "planifiee",
    scheduledDate: formData.get("scheduledDate"),
    scheduledTime: formData.get("scheduledTime") ?? "",
    address: formData.get("address") ?? "",
    technician: formData.get("technician") ?? "",
    notes: formData.get("notes") ?? "",
    feedback: formData.get("feedback") ?? "",
    issue: formData.get("issue") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const db = await getDb();
  const { id, ...values } = parsed.data;
  const [client] = await db
    .select({ id: schema.clients.id })
    .from(schema.clients)
    .where(and(eq(schema.clients.id, values.clientId), eq(schema.clients.orgId, org.id)));
  if (!client) return { error: "Client not found." };

  if (id) {
    await db
      .update(schema.interventions)
      .set(values)
      .where(and(eq(schema.interventions.id, id), eq(schema.interventions.orgId, org.id)));
  } else {
    await db.insert(schema.interventions).values({ ...values, orgId: org.id });
  }
  revalidatePath("/app", "layout");
  redirect("/app/interventions");
}

export async function setInterventionStatus(formData: FormData) {
  const { org } = await requireSession();
  const id = z.uuid().parse(formData.get("id"));
  const status = z.enum(STATUSES).parse(formData.get("status"));
  const db = await getDb();
  await db
    .update(schema.interventions)
    .set({ status })
    .where(and(eq(schema.interventions.id, id), eq(schema.interventions.orgId, org.id)));
  revalidatePath("/app", "layout");
}

export async function deleteIntervention(formData: FormData) {
  const { org } = await requireSession();
  const id = z.uuid().parse(formData.get("id"));
  const db = await getDb();
  await db
    .delete(schema.interventions)
    .where(and(eq(schema.interventions.id, id), eq(schema.interventions.orgId, org.id)));
  revalidatePath("/app", "layout");
  redirect("/app/interventions");
}
