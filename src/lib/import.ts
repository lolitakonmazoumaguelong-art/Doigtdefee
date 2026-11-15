import { CATEGORIES } from "@/lib/catalog";
import { parseNumber } from "@/lib/format";

export type ImportRow = {
  name: string;
  category: string;
  kind: "produit" | "service";
  unitPrice: number;
  costPrice: number;
  stock: number;
  supplier: string;
  reference: string;
};

const COLUMNS = ["name", "category", "unitPrice", "costPrice", "stock", "supplier", "reference"] as const;
type Column = (typeof COLUMNS)[number];

const HEADER_ALIASES: Record<string, Column> = {
  name: "name", item: "name", product: "name", description: "name", designation: "name",
  category: "category", type: "category",
  "selling price": "unitPrice", price: "unitPrice", "sale price": "unitPrice", "unit price": "unitPrice",
  "cost price": "costPrice", cost: "costPrice", "purchase price": "costPrice",
  quantity: "stock", qty: "stock", stock: "stock",
  supplier: "supplier", vendor: "supplier",
  reference: "reference", ref: "reference", sku: "reference", code: "reference",
};

/** Découpe une ligne en cellules, en respectant les guillemets du format CSV. */
function splitLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (char === '"') quoted = false;
      else current += char;
    } else if (char === '"' && current === "") quoted = true;
    else if (char === delimiter) { cells.push(current); current = ""; }
    else current += char;
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

function resolveCategory(input: string) {
  const value = input.toLowerCase();
  if (!value) return "autre";
  const found = CATEGORIES.find(
    (c) => c.id === value || c.label.toLowerCase() === value || c.label.toLowerCase().startsWith(value) || value.startsWith(c.label.toLowerCase().split(" ")[0]),
  );
  if (found) return found.id;
  return /service|labou?r|install/.test(value) ? "service" : "autre";
}

/**
 * Lit un tableau collé depuis Excel (tabulations) ou un fichier CSV (virgules ou points-virgules).
 * Colonnes attendues : Name, Category, Selling price, Cost price, Quantity, Supplier, Reference.
 * Une ligne d'en-tête est reconnue et permet de changer l'ordre des colonnes.
 */
export function parseCatalogueImport(raw: string): { rows: ImportRow[]; errors: string[] } {
  const lines = raw.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
  const rows: ImportRow[] = [];
  const errors: string[] = [];
  if (!lines.length) return { rows, errors: ["Nothing to import: paste your list first."] };

  const delimiter = lines.some((l) => l.includes("\t")) ? "\t" : lines.some((l) => l.includes(";")) ? ";" : ",";
  let order: (Column | null)[] = [...COLUMNS];
  let start = 0;
  const first = splitLine(lines[0], delimiter).map((c) => c.toLowerCase());
  if (first.some((c) => HEADER_ALIASES[c] === "name")) {
    order = first.map((c) => HEADER_ALIASES[c] ?? null);
    start = 1;
  }

  for (let i = start; i < lines.length; i++) {
    const cells = splitLine(lines[i], delimiter);
    const get = (column: Column) => { const index = order.indexOf(column); return index >= 0 ? (cells[index] ?? "") : ""; };
    const number = (column: Column) => { const v = get(column); return v === "" ? 0 : parseNumber(v.replace(/[^\d.,\s-]/g, "")); };
    const name = get("name");
    const unitPrice = number("unitPrice");
    const costPrice = number("costPrice");
    const stock = number("stock");
    const label = `Row ${i + 1}`;
    if (!name) { errors.push(`${label}: the name is missing.`); continue; }
    if (name.length > 200) { errors.push(`${label}: the name is too long.`); continue; }
    if (![unitPrice, costPrice, stock].every((n) => Number.isFinite(n) && n >= 0 && n <= 20_000_000)) {
      errors.push(`${label} (${name}): a price or quantity is not a valid number.`);
      continue;
    }
    const category = resolveCategory(get("category"));
    const kind = category === "service" ? "service" : "produit";
    rows.push({
      name,
      category,
      kind,
      unitPrice: Math.round(unitPrice * 100),
      costPrice: Math.round(costPrice * 100),
      stock: kind === "service" ? 0 : Math.floor(stock),
      supplier: kind === "service" ? "" : get("supplier").slice(0, 100),
      reference: get("reference").slice(0, 100),
    });
  }
  return { rows, errors };
}
