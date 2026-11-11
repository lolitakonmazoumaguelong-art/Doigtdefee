import type { DocStatus, DocType } from "@/db/schema";

export const CURRENCIES = [
  { code: "MUR", label: "Mauritian rupee (Rs)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "XAF", label: "CFA franc BEAC (FCFA)" },
  { code: "XOF", label: "CFA franc BCEAO (CFA)" },
  { code: "USD", label: "US dollar ($)" },
  { code: "CAD", label: "Canadian dollar (CA$)" },
  { code: "CHF", label: "Swiss franc (CHF)" },
  { code: "MAD", label: "Moroccan dirham (MAD)" },
] as const;

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [string, ...string[]];

/** Lit un nombre saisi à l'anglaise ou à la française : "1,500.50", "1 500,50", "1,500", "12,5". NaN si invalide. */
export function parseNumber(input: unknown) {
  let s = String(input ?? "").replace(/[\s\u00a0\u202f]/g, "");
  if (s.includes(",") && s.includes(".")) s = s.replace(/,/g, ""); // 1,500.50
  else if (/^-?\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, ""); // 1,500
  else s = s.replace(",", "."); // 12,5
  return s === "" ? NaN : Number(s);
}

/** Convertit une saisie en centimes. Renvoie NaN si invalide. */
export function parseAmount(input: unknown) {
  const n = parseNumber(input);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

export function formatMoney(cents: number, currency: string) {
  if (currency === "MUR") {
    const amount = new Intl.NumberFormat("en-GB", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 });
    return `Rs ${amount.format(cents / 100)}`;
  }
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(cents / 100);
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
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

export const typeLabel = (type: DocType) => (type === "devis" ? "Quote" : "Invoice");

export type Tone = "neutral" | "info" | "good" | "bad" | "warn";

export function isOverdue(doc: { type: DocType; status: DocStatus; dueDate: string | null }) {
  return doc.type === "facture" && doc.status === "envoye" && !!doc.dueDate && doc.dueDate < today();
}

export function statusInfo(doc: { type: DocType; status: DocStatus; dueDate: string | null }): {
  label: string;
  tone: Tone;
} {
  if (isOverdue(doc)) return { label: "Overdue", tone: "bad" };
  switch (doc.status) {
    case "brouillon":
      return { label: "Draft", tone: "neutral" };
    case "envoye":
      return { label: doc.type === "devis" ? "Sent" : "Awaiting payment", tone: "info" };
    case "accepte":
      return { label: "Accepted", tone: "good" };
    case "refuse":
      return { label: "Declined", tone: "warn" };
    case "paye":
      return { label: "Paid", tone: "good" };
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
