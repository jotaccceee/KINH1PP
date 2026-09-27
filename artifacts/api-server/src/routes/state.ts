import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { z } from "zod/v4";

const id = z.string().min(1).max(100);
const text = z.string().max(2000);
const money = z.number().finite().nonnegative();
const day = z.iso.date();
const customer = z.object({ id, name: text.min(1), phone: text, notes: text, createdAt: day });
const product = z.object({
  id, category: text, name: text.min(1), size: text, cost: money, price: money,
  stock: z.number().int().nonnegative(), image_url: text.optional(),
});
const item = z.object({
  productId: text, productName: text, size: text, detail: text.optional(),
  quantity: z.number().int().positive(), unitPrice: money,
});
const sale = z.object({
  id, date: day, customerId: id, customerName: text, productId: text, productName: text,
  size: text, quantity: z.number().int().positive(), unitPrice: money,
  method: z.enum(["Efectivo", "Transferencia", "Mercado Pago"]),
  status: z.enum(["Cobrado", "Pendiente", "Seña / Pago Parcial"]), paidAmount: money,
  items: z.array(item).optional(), total: money.optional(), saldoPendiente: money.optional(),
});
const expense = z.object({ id, date: day, concept: text, category: text, amount: money });
const storeSchema = z.object({
  customers: z.array(customer).max(10000), products: z.array(product).max(10000),
  sales: z.array(sale).max(10000), expenses: z.array(expense).max(10000),
});
const updateSchema = z.object({ revision: z.number().int().nonnegative(), store: storeSchema });
type Store = z.infer<typeof storeSchema>;
type Entity = Store[keyof Store][number];

const router: IRouter = Router();

async function readState(query: (sql: string, values?: unknown[]) => Promise<{ rows: any[] }>) {
  const versions = await query("SELECT revision FROM state_version WHERE id = 1");
  const customers = await query('SELECT id, name, phone, notes, created_at AS "createdAt" FROM customers ORDER BY created_at DESC, id DESC');
  const products = await query('SELECT id, category, name, size, cost, price, stock, image_url FROM products ORDER BY id DESC');
  const sales = await query('SELECT id, date, customer_id AS "customerId", customer_name AS "customerName", product_id AS "productId", product_name AS "productName", size, quantity, unit_price AS "unitPrice", method, status, paid_amount AS "paidAmount", total, saldo_pendiente AS "saldoPendiente" FROM sales ORDER BY date DESC, id DESC');
  const items = await query('SELECT sale_id, product_id AS "productId", product_name AS "productName", size, detail, quantity, unit_price AS "unitPrice" FROM sale_items ORDER BY position');
  const expenses = await query("SELECT id, date, concept, category, amount FROM expenses ORDER BY date DESC, id DESC");
  const itemsBySale = new Map<string, any[]>();
  for (const { sale_id, ...item } of items.rows) {
    const list = itemsBySale.get(sale_id) ?? [];
    list.push({ ...item, unitPrice: Number(item.unitPrice) });
    itemsBySale.set(sale_id, list);
  }
  return {
    revision: versions.rows[0]?.revision ?? 0,
    store: {
      customers: customers.rows,
      products: products.rows.map((p) => ({ ...p, cost: Number(p.cost), price: Number(p.price) })),
      sales: sales.rows.map((s) => ({
        ...s, unitPrice: Number(s.unitPrice), paidAmount: Number(s.paidAmount),
        ...(s.total === null ? {} : { total: Number(s.total) }),
        ...(s.saldoPendiente === null ? {} : { saldoPendiente: Number(s.saldoPendiente) }),
        ...(itemsBySale.has(s.id) ? { items: itemsBySale.get(s.id) } : {}),
      })),
      expenses: expenses.rows.map((e) => ({ ...e, amount: Number(e.amount) })),
    } as Store,
  };
}

router.get("/state", async (req, res): Promise<void> => {
  try {
    res.json(await readState((sql, values) => pool.query(sql, values)));
  } catch (error) {
    req.log.error({ err: error }, "Could not load state");
    res.status(503).json({ error: "No se pudo conectar con la base de datos." });
  }
});

router.get("/catalog", async (req, res): Promise<void> => {
  try {
    const { rows } = await pool.query("SELECT id, category, name, size, price, stock, image_url FROM products WHERE stock > 0 ORDER BY name");
    res.json(rows.map((p) => ({ ...p, price: Number(p.price) })));
  } catch (error) {
    req.log.error({ err: error }, "Could not load catalog");
    res.status(503).json({ error: "No se pudo cargar el catálogo." });
  }
});

// Every change is checked against a shared revision under a row lock. The UI retries
// its original operation against the newest state when another device writes first.
router.put("/state", async (req, res): Promise<void> => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO state_version (id, revision) VALUES (1, 0) ON CONFLICT (id) DO NOTHING");
    const { rows } = await client.query("SELECT revision FROM state_version WHERE id = 1 FOR UPDATE");
    if (rows[0].revision !== parsed.data.revision) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "Otra sesión actualizó los datos. Reintentá la operación." });
      return;
    }
    const previous = (await readState((sql, values) => client.query(sql, values))).store;
    const next = parsed.data.store;
    const changes: { entity: string; entityId: string; action: string; before: Entity | null; after: Entity | null }[] = [];
    const tables = {
      customers: { table: "customers", columns: ["id", "name", "phone", "notes", "created_at"], values: (c: Store["customers"][number]) => [c.id, c.name, c.phone, c.notes, c.createdAt] },
      products: { table: "products", columns: ["id", "category", "name", "size", "cost", "price", "stock", "image_url"], values: (p: Store["products"][number]) => [p.id, p.category, p.name, p.size, p.cost, p.price, p.stock, p.image_url ?? ""] },
      sales: { table: "sales", columns: ["id", "date", "customer_id", "customer_name", "product_id", "product_name", "size", "quantity", "unit_price", "method", "status", "paid_amount", "total", "saldo_pendiente"], values: (s: Store["sales"][number]) => [s.id, s.date, s.customerId, s.customerName, s.productId, s.productName, s.size, s.quantity, s.unitPrice, s.method, s.status, s.paidAmount, s.total ?? null, s.saldoPendiente ?? null] },
      expenses: { table: "expenses", columns: ["id", "date", "concept", "category", "amount"], values: (e: Store["expenses"][number]) => [e.id, e.date, e.concept, e.category, e.amount] },
    } as const;
    for (const key of ["customers", "products", "sales", "expenses"] as const) {
      const config = tables[key];
      const oldMap = new Map(previous[key].map((row) => [row.id, row as Entity]));
      const nextMap = new Map(next[key].map((row) => [row.id, row as Entity]));
      if (nextMap.size !== next[key].length) throw new Error(`Duplicate ID in ${key}`);
      for (const [entityId, before] of oldMap) {
        if (nextMap.has(entityId)) continue;
        await client.query(`DELETE FROM ${config.table} WHERE id = $1`, [entityId]);
        changes.push({ entity: key, entityId, action: "deleted", before, after: null });
      }
      for (const [entityId, after] of nextMap) {
        const before = oldMap.get(entityId) ?? null;
        if (before && JSON.stringify(before) === JSON.stringify(after)) continue;
        const values = (config.values as (row: Entity) => unknown[])(after);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
        const updates = config.columns.slice(1).map((col) => `${col} = EXCLUDED.${col}`).join(", ");
        await client.query(`INSERT INTO ${config.table} (${config.columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updates}`, values);
        if (key === "sales") {
          const newSale = after as Store["sales"][number];
          await client.query("DELETE FROM sale_items WHERE sale_id = $1", [entityId]);
          for (const [position, item] of (newSale.items ?? []).entries()) {
            await client.query(
              "INSERT INTO sale_items (sale_id, position, product_id, product_name, size, detail, quantity, unit_price) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
              [entityId, position, item.productId, item.productName, item.size, item.detail ?? "", item.quantity, item.unitPrice],
            );
          }
          const delta = newSale.paidAmount - ((before as Store["sales"][number] | null)?.paidAmount ?? 0);
          if (delta > 0) {
            await client.query(
              "INSERT INTO payments (sale_id, customer_id, amount, method) VALUES ($1,$2,$3,$4)",
              [entityId, newSale.customerId, delta, newSale.method],
            );
          }
        }
        changes.push({ entity: key, entityId, action: before ? "updated" : "created", before, after });
      }
    }
    for (const change of changes) {
      await client.query(
        "INSERT INTO activity (entity, entity_id, action, before, after) VALUES ($1,$2,$3,$4,$5)",
        [change.entity, change.entityId, change.action, change.before ? JSON.stringify(change.before) : null, change.after ? JSON.stringify(change.after) : null],
      );
    }
    await client.query("UPDATE state_version SET revision = revision + 1 WHERE id = 1");
    await client.query("COMMIT");
    res.json({ revision: rows[0].revision + 1, store: next });
  } catch (error) {
    await client.query("ROLLBACK");
    req.log.error({ err: error }, "Could not save state");
    res.status(503).json({ error: "No se pudieron guardar los cambios." });
  } finally {
    client.release();
  }
});

export default router;