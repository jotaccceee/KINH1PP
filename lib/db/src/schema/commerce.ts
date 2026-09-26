import { date, integer, jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const customersTable = pgTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: date("created_at", { mode: "string" }).notNull(),
});

export const productsTable = pgTable("products", {
  id: text("id").primaryKey(),
  category: text("category").notNull(),
  name: text("name").notNull(),
  size: text("size").notNull(),
  cost: numeric("cost", { mode: "number" }).notNull(),
  price: numeric("price", { mode: "number" }).notNull(),
  stock: integer("stock").notNull(),
  imageUrl: text("image_url").notNull().default(""),
});

export const salesTable = pgTable("sales", {
  id: text("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull(),
  customerId: text("customer_id").notNull(),
  customerName: text("customer_name").notNull(),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  size: text("size").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { mode: "number" }).notNull(),
  method: text("method").notNull(),
  status: text("status").notNull(),
  paidAmount: numeric("paid_amount", { mode: "number" }).notNull(),
  total: numeric("total", { mode: "number" }),
  saldoPendiente: numeric("saldo_pendiente", { mode: "number" }),
});

export const saleItemsTable = pgTable("sale_items", {
  saleId: text("sale_id").notNull().references(() => salesTable.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  size: text("size").notNull(),
  detail: text("detail").notNull().default(""),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { mode: "number" }).notNull(),
});

export const expensesTable = pgTable("expenses", {
  id: text("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull(),
  concept: text("concept").notNull(),
  category: text("category").notNull(),
  amount: numeric("amount", { mode: "number" }).notNull(),
});

export const paymentsTable = pgTable("payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  saleId: text("sale_id").notNull(),
  customerId: text("customer_id").notNull(),
  amount: numeric("amount", { mode: "number" }).notNull(),
  method: text("method").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityTable = pgTable("activity", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stateVersionTable = pgTable("state_version", {
  id: integer("id").primaryKey(),
  revision: integer("revision").notNull().default(0),
});