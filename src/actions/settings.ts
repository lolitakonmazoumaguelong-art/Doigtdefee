"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireSession } from "@/lib/auth";
import { CURRENCY_CODES } from "@/lib/format";
import type { FormState } from "@/lib/types";

const settingsSchema = z.object({
  name: z.string().trim().min(1, "Le nom de l'entreprise est obligatoire.").max(200),
  address: z.string().trim().max(500),
  phone: z.string().trim().max(50),
  email: z.union([z.literal(""), z.email("Adresse e-mail invalide.")]),
  legalId: z.string().trim().max(100),
  vatNumber: z.string().trim().max(100),
  currency: z.enum(CURRENCY_CODES),
  taxRate: z.coerce.number("Taux de TVA invalide.").min(0).max(100),
  footerNote: z.string().trim().max(1000),
  accentColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Couleur invalide."),
  // Image redimensionnée par le navigateur, jamais de SVG
  logo: z.union([
    z.literal(""),
    z
      .string()
      .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Format de logo non pris en charge.")
      .max(400_000, "Logo trop lourd."),
  ]),
});

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const { org, user } = await requireSession();
  if (user.role !== "owner") return { error: "Seul le responsable du compte peut modifier ces réglages." };

  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") ?? "",
    phone: formData.get("phone") ?? "",
    email: String(formData.get("email") ?? "").trim(),
    legalId: formData.get("legalId") ?? "",
    vatNumber: formData.get("vatNumber") ?? "",
    currency: formData.get("currency"),
    taxRate: String(formData.get("taxRate") ?? "0").replace(",", "."),
    footerNote: formData.get("footerNote") ?? "",
    accentColor: formData.get("accentColor") ?? "#17201d",
    logo: formData.get("logo") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const db = await getDb();
  await db.update(schema.orgs).set(parsed.data).where(eq(schema.orgs.id, org.id));
  revalidatePath("/app", "layout");
  return { ok: true };
}
