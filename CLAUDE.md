# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Stack

Next.js 16 (App Router, `src/` dir) + React 19 + TypeScript + Tailwind CSS v4, with Better Auth for authentication and Drizzle ORM over Neon Postgres. Package manager is pnpm. Per AGENTS.md, check `node_modules/next/dist/docs/` before using Next.js APIs — don't rely on older Next.js conventions.

## Commands

```bash
pnpm dev            # dev server on :3000
pnpm build          # production build (needs DATABASE_URL set, see below)
pnpm lint           # ESLint (flat config, eslint-config-next)
pnpm typecheck      # tsc --noEmit
pnpm auth:generate  # regenerate Better Auth tables into src/db/schema/auth.ts
pnpm auth:make-admin <email> [--revoke]  # set a user's role (admin/customer)
pnpm db:generate    # create SQL migration in ./drizzle from schema changes
pnpm db:migrate     # apply migrations
pnpm db:push        # push schema directly — don't use; see Database conventions
pnpm db:studio      # Drizzle Studio
pnpm db:seed        # upsert the sample catalog (src/db/seed-data.ts); safe to re-run
```

There is no test runner configured yet.

Setup: copy `.env.example` to `.env` and fill in `DATABASE_URL` (Neon pooled connection string), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. Use `.env`, not `.env.local`: `drizzle.config.ts` loads env via `dotenv/config`, which only reads `.env`.

## Architecture

- **Database** (`src/db/`): `index.ts` exports a single `db` built with the `drizzle-orm/neon-http` driver and the full schema, and throws at import time if `DATABASE_URL` is missing — so anything that imports `@/db` (including the auth module and the auth route) fails without it. The HTTP driver is stateless and does not support interactive `db.transaction()`; use `db.batch()` or switch to the WebSocket driver if transactions are needed.
- **Auth**: `src/lib/auth.ts` is the server-side Better Auth instance (Drizzle adapter, `pg` provider) — use `auth.api.*` in server components, route handlers, and server actions. Keep `nextCookies()` as the last plugin so server actions can set cookies. `src/lib/auth-client.ts` is the React client for client components. All `/api/auth/*` requests are handled by `src/app/api/auth/[...all]/route.ts`. When adding Better Auth plugins or options that change tables, re-run `pnpm auth:generate`, then `db:generate`/`db:migrate`.
- Import alias `@/*` maps to `src/*`.

## Auth conventions

- Email/password only, with database sessions (30 days, no cookie cache), so sign-out and role changes apply on the next request.
- `src/lib/session.ts` (`server-only`) is the auth DAL. Every protected page calls `requireUser(returnTo)` or `requireAdmin()` itself. Every admin server action, route handler, or admin-only query calls `assertAdmin()` first (see `src/lib/admin-queries.ts`). Never rely on layouts or `src/proxy.ts` for protection: the proxy only redirects requests that have no session cookie at all.
- Sign-in, sign-up, and sign-out are server actions in `src/app/(auth)/actions.ts` calling `auth.api.*`. Redirect targets from `?next=` go through `safeNext`.
- Roles: `user.role` is `customer` (default) or `admin`. It is `input: false`, so clients can't set it. Change it only with `pnpm auth:make-admin <email> [--revoke]`.

## Database conventions

- **Schema files**: tables live in `src/db/schema/`, and `index.ts` re-exports each file; it is what both `drizzle.config.ts` and `src/db/index.ts` load. `auth.ts` belongs to `pnpm auth:generate`, which overwrites it, so never hand-edit it or put app tables there. Put app tables in their own file (e.g. `catalog.ts`) and add it to `index.ts`.
- **Migrations only**: change the schema, run `db:generate`, review the SQL in `./drizzle` and commit it, then run `db:migrate`. Don't use `db:push`. Keep unrelated changes (e.g. Better Auth tables vs. app tables) in separate migrations.
- **Seeding is not migrating**: sample data lives in `src/db/seed-data.ts` and is loaded by `pnpm db:seed`, which upserts on natural keys (slugs, `(product_id, size)`) so it is safe to re-run. Never put data inserts in migrations.
- **Money**: integer cents (`price_cents`); `formatPrice` takes cents. Never store floats.
- **Stock**: `product_stock` holds units per size (ordered by `position`; single-size items use the `ONE_SIZE` label). Sizes are not variants: no per-size SKU or price. Stock status (in stock, low, sold out) is derived with `stockStatus`, not stored.
- **Orders** (`src/db/schema/orders.ts`): every order belongs to a signed-in user (`user_id` not null, restrict). `status` (pending/confirmed/cancelled) and `payment_status` (unpaid/processing/paid/failed) are separate columns, and a check constraint allows only the legal pairs. Payment status is set only from Stripe data (webhook or a server-side session retrieve), never from the client. `order_items` snapshots name, slug, image and unit price at checkout. `stripe_events` records processed webhook event ids for dedupe.
- **Checkout** (`src/lib/checkout.ts`, `src/lib/orders.ts`): the bag form posts nothing. `startCheckout` re-resolves the bag from the database, creates a pending order and reserves its stock in one `db.batch()` (the `product_stock` quantity check rejects oversells), then opens a Stripe Checkout Session with inline `price_data` built from the order rows. Orders become paid only in the webhook (`src/app/api/stripe/webhook/route.ts`, signature-verified). The success page only reads the stored status. Cancelling, expiry and async payment failure all go through `releaseOrderQuery`, which restores stock only when it actually cancels the order.
- **Reading data**: server code goes through `src/lib/product-queries.ts` (`server-only`), which maps rows to the plain `Product` type in `src/lib/products.ts`. Client components import only types and helpers from `lib/products.ts`, never `@/db`.
- **Constraints in the schema**: use foreign keys with explicit `onDelete` (restrict for lookups like categories, cascade for owned rows like stock), unique natural keys (slugs), and `check()` for non-negative quantities and prices.
