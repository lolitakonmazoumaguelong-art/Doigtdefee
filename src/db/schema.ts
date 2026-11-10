import { randomBytes } from "node:crypto";
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Une organisation = une entreprise cliente du SaaS. Toutes les données lui sont rattachées.
export const orgs = pgTable("orgs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  legalId: text("legal_id").notNull().default(""),
  vatNumber: text("vat_number").notNull().default(""),
  // Logo en data URL (image redimensionnée côté navigateur) et couleur des documents
  logo: text("logo").notNull().default(""),
  accentColor: text("accent_color").notNull().default("#17201d"),
  currency: text("currency").notNull().default("MUR"),
  taxRate: real("tax_rate").notNull().default(0),
  footerNote: text("footer_note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: text("role").$type<"owner" | "member">().notNull().default("owner"),
    // Dernière lecture du fil d'équipe, pour le compteur de non-lus
    messagesReadAt: timestamp("messages_read_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("users_org_idx").on(t.orgId)],
);

export const sessions = pgTable(
  "sessions",
  {
    // sha256 du jeton stocké dans le cookie
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind").$type<ClientKind>().notNull().default("particulier"),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    address: text("address").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("clients_org_idx").on(t.orgId)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    reference: text("reference").notNull().default(""),
    category: text("category").notNull().default("autre"),
    // "service" = main d'oeuvre, forfait : pas de stock
    kind: text("kind").$type<ProductKind>().notNull().default("produit"),
    // Montants en centimes
    unitPrice: integer("unit_price").notNull().default(0),
    costPrice: integer("cost_price").notNull().default(0),
    stock: integer("stock").notNull().default(0),
    minStock: integer("min_stock").notNull().default(0),
    // Niveau visé après réapprovisionnement (0 = calculé automatiquement)
    targetStock: integer("target_stock").notNull().default(0),
    supplier: text("supplier").notNull().default(""),
    // Produit arrêté : plus proposé dans les devis ni les commandes, historique conservé
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("products_org_idx").on(t.orgId)],
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: text("reason").$type<MovementReason>().notNull(),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("stock_movements_product_idx").on(t.productId)],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    type: text("type").$type<DocType>().notNull(),
    status: text("status").$type<DocStatus>().notNull().default("brouillon"),
    year: integer("year").notNull(),
    seq: integer("seq").notNull(),
    number: text("number").notNull(),
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date"),
    taxRate: real("tax_rate").notNull().default(0),
    subtotal: integer("subtotal").notNull().default(0),
    total: integer("total").notNull().default(0),
    notes: text("notes").notNull().default(""),
    sourceId: uuid("source_id"),
    // true une fois le stock décompté (facture émise)
    stockApplied: boolean("stock_applied").notNull().default(false),
    // Jeton du lien de consultation envoyé au client final
    shareToken: text("share_token")
      .notNull()
      .unique()
      .$defaultFn(() => randomBytes(24).toString("hex")),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("documents_org_idx").on(t.orgId),
    uniqueIndex("documents_number_idx").on(t.orgId, t.type, t.year, t.seq),
  ],
);

export const lineItems = pgTable(
  "line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    position: integer("position").notNull(),
    description: text("description").notNull(),
    quantity: real("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
  },
  (t) => [index("line_items_document_idx").on(t.documentId)],
);

export const interventions = pgTable(
  "interventions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: text("type").$type<InterventionType>().notNull().default("installation"),
    status: text("status").$type<InterventionStatus>().notNull().default("planifiee"),
    scheduledDate: date("scheduled_date").notNull(),
    scheduledTime: text("scheduled_time").notNull().default(""),
    address: text("address").notNull().default(""),
    technician: text("technician").notNull().default(""),
    // Bilan après intervention : avis du client et difficulté rencontrée
    feedback: text("feedback").$type<Feedback>().notNull().default(""),
    issue: text("issue").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("interventions_org_idx").on(t.orgId)],
);

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    supplier: text("supplier").notNull().default(""),
    status: text("status").$type<PurchaseStatus>().notNull().default("commande"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    receivedAt: timestamp("received_at", { withTimezone: true }),
  },
  (t) => [index("purchase_orders_org_idx").on(t.orgId)],
);

export const purchaseItems = pgTable(
  "purchase_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull(),
    costPrice: integer("cost_price").notNull().default(0),
  },
  (t) => [index("purchase_items_order_idx").on(t.orderId)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull(),
    body: text("body").notNull(),
    // Consigne épinglée par le responsable, affichée en haut du fil
    pinned: boolean("pinned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_org_idx").on(t.orgId, t.createdAt)],
);

export type ClientKind = "particulier" | "entreprise";
export type ProductKind = "produit" | "service";
export type MovementReason = "entree" | "sortie" | "facture" | "annulation" | "commande" | "inventaire" | "defaut";
export type Feedback = "" | "bon" | "moyen" | "mauvais";
export type PurchaseStatus = "commande" | "recue" | "annulee";
export type DocType = "devis" | "facture";
export type DocStatus = "brouillon" | "envoye" | "accepte" | "refuse" | "paye";
export type InterventionType = "installation" | "maintenance" | "depannage" | "visite";
export type InterventionStatus = "planifiee" | "en_cours" | "terminee" | "annulee";
export type Org = typeof orgs.$inferSelect;
export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Doc = typeof documents.$inferSelect;
export type LineItem = typeof lineItems.$inferSelect;
export type Intervention = typeof interventions.$inferSelect;
