# Atelier Store

Next.js (App Router) + TypeScript + Tailwind CSS, with Better Auth, Drizzle ORM, and Postgres on Neon.

## Setup

```bash
pnpm install
cp .env.example .env   # fill in DATABASE_URL and BETTER_AUTH_SECRET
pnpm auth:generate     # generate Better Auth tables into src/db/schema/auth.ts
pnpm db:migrate        # apply migrations in ./drizzle
pnpm db:seed           # load the sample catalog
pnpm dev
```

## Layout

- `src/db/index.ts`: Drizzle client (Neon HTTP driver)
- `src/db/schema/`: Drizzle schema (`catalog.ts` for app tables, generated `auth.ts`)
- `src/lib/auth.ts`: Better Auth server instance (Drizzle adapter)
- `src/lib/auth-client.ts`: Better Auth React client
- `src/app/api/auth/[...all]/route.ts`: Better Auth route handler
- `drizzle.config.ts`: drizzle-kit config (migrations go to `./drizzle`)

## Scripts

| Script | Purpose |
| --- | --- |
| `dev` / `build` / `start` | Next.js |
| `lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `auth:generate` | Generate the Better Auth Drizzle schema |
| `db:generate` / `db:migrate` / `db:push` / `db:studio` | drizzle-kit |
