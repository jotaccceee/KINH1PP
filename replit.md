# KINSH1P

Panel web para administrar ventas, cobros, clientes, inventario y gastos de un emprendimiento de ropa.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/moda-control run dev` — run the panel web
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — PostgreSQL connection string (provided by the Replit database)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/moda-control/src/App.tsx` — panel UI; loads and saves the complete store through `/api/state`.
- `artifacts/moda-control/src/tienda.js` — public catalog; loads available products through `/api/catalog`.
- `artifacts/api-server/src/routes/state.ts` — state and catalog API, revision checks, payments, and activity history.
- `lib/db/src/schema/commerce.ts` — PostgreSQL tables for customers, products, sales, sale items, expenses, payments, activity, and sync revision.
- Run `pnpm --filter @workspace/db run push` after schema changes.

## Architecture decisions

- PostgreSQL is the only source of truth; browser storage is not used for business data.
- State writes use a database revision checked under a row lock to avoid silently overwriting another device's changes.
- The web panel refreshes state on focus and every five seconds; the public catalog refreshes on the same interval.

## Product

KINSH1P centralizes the shop's product catalog, stock, sales, payments, customers, debts, and expenses so the same information is available from every device.

## User preferences

La interfaz y los mensajes visibles para el usuario están en español rioplatense.

## Gotchas

- The API must be running for the panel and public catalog to load.
- A write conflict reloads the latest server state instead of overwriting another device silently.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
