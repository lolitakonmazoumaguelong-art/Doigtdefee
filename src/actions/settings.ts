"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireSession } from "@/lib/auth";
import { CURRENCY_CODES, parseNumber } from "@/lib/format";
import type { FormState } from "@/lib/types";

const settingsSchema = z.object({
  name: z.string().trim().min(1, "The company name is required.").max(200),
  address: z.string().trim().max(500),
  phone: z.string().trim().max(50),
  email: z.union([z.literal(""), z.email("Invalid email address.")]),
  legalId: z.string().trim().max(100),
  vatNumber: z.string().trim().max(100),
  currency: z.enum(CURRENCY_CODES),
  taxRate: z.coerce.number("Invalid VAT rate.").min(0).max(100),
  footerNote: z.string().trim().max(1000),
  accentColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Invalid colour."),
  // Image redimensionnée par le navigateur, jamais de SVG
  logo: z.union([
    z.literal(""),
    z
      .string()
      .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Unsupported logo format.")
      .max(400_000, "Logo file too large."),
  ]),
});

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const { org, user } = await requireSession();
  if (user.role !== "owner") return { error: "Only the account owner can change these settings." };

  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") ?? "",
    phone: formData.get("phone") ?? "",
    email: String(formData.get("email") ?? "").trim(),
    legalId: formData.get("legalId") ?? "",
    vatNumber: formData.get("vatNumber") ?? "",
    currency: formData.get("currency"),
    taxRate: parseNumber(formData.get("taxRate") ?? "0"),
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
