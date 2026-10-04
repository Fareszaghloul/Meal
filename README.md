# MealPrep

A private, single-household meal and nutrition tracker. Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Prisma 6 · PostgreSQL (Prisma Postgres).

## Daily use

- **Today** (`/`) — calories, macros, fiber/sodium (if targeted), water and weight at a glance; meals with inline edit, duplicate, move, delete, copy-yesterday and save-as-meal. Dates are the browser's **local** calendar date and switching days is instant (cached + prefetched).
- **Add food** — `N` on the dashboard. Recent / Favorites / My foods / **Library** / Recipes / Saved meals / Quick add, plus the online databases (Open Food Facts, USDA, optional FatSecret). Tick several rows to add them in one go at their default serving, or tap a row to pick a serving ("1 large egg", "1 cup", grams…) and quantity. `/` focuses search, `Enter` picks the first match, `Esc` closes.
- **Food library** — ~280 built-in staples (meat, fish, dairy, grains, legumes, vegetables, fruit, nuts, Levantine basics, fast food, drinks) with USDA-based per-100 g values and household servings. Source of truth is `prisma/library/foods.ts`; edit it and run `node prisma/library/generate-migration.mjs` to produce idempotent SQL for a new migration. Every food (yours or built-in) can carry several named servings; nutrition always derives from grams.
- **History** — month calendar with logged / partial / empty days.
- **Analytics** — 7/30/90-day averages, adherence, most-logged foods, weight trend.
- **Weight** — daily weigh-ins with a 7-day average trend, InBody scans kept separately.
- **Settings** — units (display only; storage is always kg/cm), tracking **timezone** (IANA; decides "today" for weigh-ins and goal dates, never moves logged days), nutrition targets with **goal history** (a change is a revision effective today; Analytics judges each day against the goal in effect then and ignores days before history began), weight goal, and a target calculator whose output is only applied when you save. Current weight is read-only: it comes from the latest daily weigh-in.
- **Settings → Your data** — **Backup** (`/api/backup`, versioned `meal-backup` JSON: every user-owned record, no secrets/auth/derived values), **Export** (food-log and weight CSV), **Restore** (validate → preview → confirm → replace all domain data in one transaction; ids are regenerated so a file restores into any account). The older additive JSON import (`/api/import`, v1 export files) still works.

**Accounts.** There is no self-service sign-up, email verification or password reset by email (no Resend). An administrator creates accounts and sets passwords under *More → Accounts*; the first admin comes from `prisma/seed.mjs` or a direct database insert.

Writes are optimistic and queued in `localStorage`; if the network or server fails they retry automatically (a badge in the sidebar shows pending changes). Validation errors are reported, never swallowed.

## Development

```bash
npm install
cp .env.example .env            # fill DATABASE_URL (+ PRISMA_DATABASE_URL) etc.
npx prisma migrate deploy       # apply migrations (never `db push` against real data)
npm run dev
```

| Script | What it does |
|---|---|
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | unit tests (calculations, dates, validation, trends) |
| `npm run test:api` | API integration tests — needs a running server (`TEST_BASE_URL`, default `http://localhost:3100`) and the test account below |
| `npm run test:e2e` | Playwright critical flow on desktop + iPhone viewports (same prerequisites) |
| `npm run prisma:status` | migration status against `DATABASE_URL` |

Test account for `test:api` / `test:e2e`: `node scratch/create-test-user.mjs` creates `e2e-test@mealprep.local` (password in the script, override with `TEST_EMAIL` / `TEST_PASSWORD`); `node scratch/create-test-user.mjs delete` removes it. Tests only write to dates in 2001 and clean up after themselves.

## Schema changes

Edit `prisma/schema.prisma`, then generate a migration from the live database and review it before deploying:

```bash
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<n>_<name>/migration.sql
npx prisma migrate deploy
```

`prisma/migrations/0_baseline` is the schema as it existed on 2026-10-03 (marked applied, never run); `1_personal_tracker` adds favorites/usage, saved meals and goals; `2_food_servings_library` adds `FoodServing` and seeds the library; `3_remove_email_flows` drops the verification/reset token tables. `20260913000000_init` is a stale SQLite-era folder also marked applied; it can be deleted.

## Layout

```
src/lib/nutrition/core.ts     all nutrient arithmetic (scale, sum, round, per-100g ↔ serving)
src/lib/dates.ts              local calendar-date helpers; the server never computes "today"
src/lib/validation.ts         zod schemas for every API boundary
src/lib/services/*            data access (food log, weight, templates)
src/lib/api/route.ts          withAuth() wrapper → consistent JSON errors
src/lib/client/day-store.ts   client cache + persistent write queue
src/components/day/*          dashboard UI
```

Secondary features (meal plan, meal prep, shopping list, pantry, barcode/label scanners, McDonald's calculator, Ollama recipe parsing, multi-user admin) are kept under **More** in the navigation and were not reworked.
