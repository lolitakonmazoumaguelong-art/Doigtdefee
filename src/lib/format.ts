import type { DocStatus, DocType } from "@/db/schema";

export const CURRENCIES = [
  { code: "MUR", label: "Roupie mauricienne (Rs)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "XAF", label: "Franc CFA BEAC (FCFA)" },
  { code: "XOF", label: "Franc CFA BCEAO (CFA)" },
  { code: "USD", label: "Dollar américain ($)" },
  { code: "CAD", label: "Dollar canadien ($ CA)" },
  { code: "CHF", label: "Franc suisse (CHF)" },
  { code: "MAD", label: "Dirham marocain (MAD)" },
] as const;

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [string, ...string[]];

/** Convertit une saisie ("12 500,50") en centimes. Renvoie NaN si invalide. */
export function parseAmount(input: unknown) {
  const n = Number(String(input ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

export function formatMoney(cents: number, currency: string) {
  if (currency === "MUR") {
    const amount = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 });
    return `Rs ${amount.format(cents / 100)}`;
  }
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(cents / 100);
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d, 12)),
  );
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const typeLabel = (type: DocType) => (type === "devis" ? "Devis" : "Facture");

export type Tone = "neutral" | "info" | "good" | "bad" | "warn";

export function isOverdue(doc: { type: DocType; status: DocStatus; dueDate: string | null }) {
  return doc.type === "facture" && doc.status === "envoye" && !!doc.dueDate && doc.dueDate < today();
}

export function statusInfo(doc: { type: DocType; status: DocStatus; dueDate: string | null }): {
  label: string;
  tone: Tone;
} {
  if (isOverdue(doc)) return { label: "En retard", tone: "bad" };
  switch (doc.status) {
    case "brouillon":
      return { label: "Brouillon", tone: "neutral" };
    case "envoye":
      return { label: doc.type === "devis" ? "Envoyé" : "En attente", tone: "info" };
    case "accepte":
      return { label: "Accepté", tone: "good" };
    case "refuse":
      return { label: "Refusé", tone: "warn" };
    case "paye":
      return { label: "Payée", tone: "good" };
  }
}

export function lineTotal(quantity: number, unitPriceCents: number) {
  return Math.round(quantity * unitPriceCents);
}

export function computeTotals(items: { quantity: number; unitPrice: number }[], taxRate: number) {
  const subtotal = items.reduce((sum, i) => sum + lineTotal(i.quantity, i.unitPrice), 0);
  const tax = Math.round((subtotal * taxRate) / 100);
  return { subtotal, tax, total: subtotal + tax };
}

/** Une facture émise est verrouillée, un devis accepté aussi. */
export function isDocEditable(doc: { type: DocType; status: DocStatus }) {
  return doc.type === "facture" ? doc.status === "brouillon" : doc.status !== "accepte";
}
