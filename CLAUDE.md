@AGENTS.md

# Meal App — Claude Code Project Instructions

This is a private personal meal and nutrition tracking application.

Project root:

C:\Users\fares\Downloads\meal

## Product principles

The application should feel like premium professional software:

- Linear
- Stripe
- Apple Health
- modern productivity software

The UI should be:

- dense but breathable
- fast
- restrained
- professional
- typography-driven
- responsive
- optimized for repeated daily use

Avoid:

- AI startup aesthetics
- glowing gradients
- excessive cards
- excessive rounded boxes
- rainbow status colors
- giant whitespace
- glassmorphism
- gamification
- unnecessary animation
- motivational coaching
- social features

Existing visual direction:

- dark surfaces
- restrained lime accent
- subtle dividers
- strong typography
- tabular numbers
- compact controls
- excellent mobile support

Do not independently invent a new design system for each page.

---

# Critical data principles

## Historical nutrition is immutable

FoodLogEntry is a historical snapshot.

Never recompute old logs from current master foods or recipes.

Editing or deleting:

- Food
- Recipe
- RecipeIngredient

must never alter nutrition already stored in historical FoodLogEntry records.

## Nutrition calculations

Use the shared deterministic nutrition utilities.

Do not duplicate calculation logic inside UI components.

Prefer existing utilities such as:

- sumNutrients
- scaleNutrients
- roundNutrients
- nutrientsForGrams
- serving utilities
- unit conversion utilities

Manufacturer / source calorie values are authoritative.

Do not silently replace calories using:

4P + 4C + 9F

Atwater calculation may only be used when explicitly requested by the user.

## Recipe rules

Recipe != Meal Template.

Recipe:
ingredients combine into one composite nutritional item.

Meal Template:
multiple foods remain separate.

Recipe ingredients use snapshot-based nutrition.

Editing or deleting a source Food must not silently alter existing recipes.

Logged recipes use FoodLogEntry snapshots and remain immutable.

---

# Date rules

Date integrity is critical.

Avoid fragile usage such as:

new Date("YYYY-MM-DD")

for date-only user data.

Use the hardened date utilities already implemented in:

src/lib/dates.ts

Preserve date-only semantics.

A record for October 3 must never move to October 2 or October 4 because of timezone conversion.

Be careful with:

- UTC conversion
- DST
- month rollover
- historical dates
- query-string dates

Reuse the existing date architecture instead of creating new date logic.

---

# Database rules

Database:
PostgreSQL + Prisma.

NEVER:

- reset the persistent application database
- run `prisma migrate reset` against persistent data
- casually use `prisma db push` for finished schema changes
- delete real user data
- rewrite applied migrations in a way that invalidates migration checksums

For schema changes:

1. inspect existing migration state
2. create a real Prisma migration
3. test it against the isolated test database
4. run `prisma migrate deploy`
5. verify `prisma migrate status`
6. never reset the normal database

---

# Test environment

Automated tests MUST use the isolated database:

meal_test

Normal development database:

postgres

Normal app:
port 3100

Automated test server:
port 3101

Reuse existing infrastructure:

- .env.test
- TEST_DATABASE_URL
- scripts/start-test-server.mjs
- scripts/run-api-tests.mjs
- scripts/test-db-setup.mjs
- src/lib/testing/safety-guard.ts
- prisma/schema.test.prisma

Never allow integration tests or Playwright to silently fall back to normal DATABASE_URL.

If TEST_DATABASE_URL is unavailable, destructive/database tests must fail.

Unit tests should remain database-independent where possible.

Do not create automated fixtures in the real Fares account.

---

# Stable product areas

The following areas have already undergone implementation and adversarial QA.

Treat them as stable unless a genuine regression is discovered:

## Add Food

Includes:

- universal search
- natural quantity parsing
- recent/frequent foods
- recipes
- restaurants
- online food providers
- portion editor
- manual nutrition entry
- favorites
- optimistic logging
- mobile support
- keyboard navigation

Do not redesign it unnecessarily.

## Today Dashboard

Includes:

- daily calorie summary
- macro progress
- meal sections
- edit/move/duplicate/delete
- hydration
- historical navigation
- optimistic updates
- mobile behavior

Do not redesign it unnecessarily.

## Food Library

Includes:

- personal/system food separation
- food details
- serving support
- duplicate detection
- favorites
- per-100g / per-serving nutrition
- historical snapshot safety
- catalog invalidation

Do not redesign it unnecessarily.

## History

Includes:

- monthly calendar
- selected-day preview
- month caching
- history API aggregation
- hardened date handling
- URL state
- keyboard navigation

Do not redesign it unnecessarily.

## Recipes

Includes:

- composite food architecture
- recipe ingredient snapshots
- fractional servings
- custom serving labels
- optional cooked yield
- gram-based recipe logging
- atomic recipe saves
- Add Food integration
- favorite / duplicate / delete
- historical immutability

Do not redesign it unnecessarily.

---

# Catalog invalidation

Existing catalog/event invalidation mechanisms should be reused.

Examples:

mealprep:catalog-invalidated
mealprep:day-updated

Do not add arbitrary page reloads to solve stale state.

Prefer targeted cache invalidation and optimistic state updates.

---

# Security

This application is private.

All user-owned API queries must enforce ownership server-side.

Never rely solely on UI visibility.

User A must not be able to access User B's:

- Foods
- Recipes
- Food logs
- Weight data
- Meal plans
- Pantry
- History
- Settings
- other private records

Validate IDs server-side.

Whitelist accepted mutation fields.

Avoid mass assignment.

Secrets must remain server-side.

---

# Performance

Avoid:

- N+1 queries
- request per keystroke
- duplicate network requests
- refetching unchanged data
- large unnecessary payloads
- repeated full catalog loads
- unnecessary rerenders

Use existing caches and request deduplication.

Optimize measurable problems rather than blindly adding memoization.

---

# Mobile

Every substantial feature must be checked at:

- 375px
- 390px
- 430px

No horizontal overflow.

Forms must work with the mobile keyboard.

Important actions must remain reachable.

Touch targets should generally be around 44px where practical.

---

# Accessibility

Maintain:

- proper labels
- focus management
- keyboard navigation
- semantic controls
- accessible dialogs/sheets
- visible focus state
- ARIA labels where appropriate

Do not rely solely on color.

---

# Code quality

Before adding a new abstraction, inspect whether an existing one should be reused.

Do not duplicate:

- nutrition math
- serving conversion
- date handling
- search ranking
- API data-access logic

Avoid giant monolithic components.

Separate:

- presentation
- domain logic
- validation
- persistence
- calculations

But do not over-engineer working code.

---

# Working method

For each new task:

1. Inspect existing implementation first.
2. Run the relevant feature.
3. Identify actual problems.
4. Reuse current architecture.
5. Implement real changes.
6. Add/update tests.
7. Run the feature in the browser.
8. Inspect console/network where relevant.
9. Run regression tests.
10. Run the production build.

Do not stop at recommendations when implementation was requested.

Do not report something as tested unless it was actually run.

---

# Mandatory verification before declaring a phase complete

Run the relevant subset plus:

- TypeScript typecheck
- lint
- unit tests
- API integration tests when applicable
- desktop E2E
- mobile E2E
- regression suites for stable areas
- production build

If database migrations are involved:

also verify the migration chain against `meal_test`.

---

# Final report format

At the end of a major phase, report:

1. Original architecture
2. Problems found
3. Architecture changes
4. UX changes
5. Data-integrity changes
6. API/database changes
7. Security findings
8. Performance findings
9. Mobile changes
10. Accessibility changes
11. Files significantly changed
12. Tests added
13. Exact test results
14. Regression results
15. Typecheck/lint/build results
16. Remaining known issues
17. Manual flows I should inspect

Do not claim "no issues" to mean the software can contain no undiscovered bugs.

Say:

"No known issues within the tested scope."

when appropriate.
