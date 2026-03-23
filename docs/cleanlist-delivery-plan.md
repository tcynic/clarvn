:::::::::::::::::: site-header
::::::::::::::::: header-inner
::: header-eyebrow
Project Delivery Plan · March 2026 · Confidential
:::

# CleanList *Project Delivery Plan* {#cleanlist-project-delivery-plan .header-title}

Epics, user stories, and junior-dev-scoped tasks for the CleanList MVP
--- 4 sprints + validation, with testing in every epic. Convex backend.

::::::::::::::: header-meta
<div>

::: meta-label
Sprints
:::

::: meta-value
4 × 2 weeks + validation
:::

</div>

<div>

::: meta-label
Epics
:::

::: meta-value
7 (incl. validation)
:::

</div>

<div>

::: meta-label
Stories
:::

::: meta-value
30 (7 test stories)
:::

</div>

<div>

::: meta-label
Backend
:::

::: meta-value
Convex
:::

</div>
:::::::::::::::
:::::::::::::::::
::::::::::::::::::

::::::::::::::::::::: {#sprints .section .section}
:::::::::::::::::::: container
::: section-eyebrow
Section 01
:::

## Sprint Plan Overview {#sprint-plan-overview .section-title}

The MVP is organized into four two-week sprints, followed by a
validation phase. Each sprint maps to one or more epics. **Every epic
includes its own testing story** (highlighted in
[yellow]{style="background:#fff8e7;padding:1px 6px;border-radius:3px"})
so that quality is validated continuously, not deferred to the end.

:::::::::::::::::: sprint-grid
::::: sprint-card
::: sprint-card-title
Sprint 1
:::

::: sprint-card-time
Weeks 1--2
:::

**Epic 1:** Convex Foundation

**Epic 2:** Bulk Seed Script

✓ Database live. 500 products scored. Schema + seed tests passing.
:::::

::::: sprint-card
::: sprint-card-title
Sprint 2
:::

::: sprint-card-time
Weeks 3--4
:::

**Epic 3:** Admin UI

✓ Admin can view queue, trigger scores, browse products. Admin flow
tests passing.
:::::

::::: sprint-card
::: sprint-card-title
Sprint 3
:::

::: sprint-card-time
Weeks 5--6
:::

**Epic 4:** Consumer App --- Core Loop

✓ Consumer app live. Consumer E2E tests passing.
:::::

::::: sprint-card
::: sprint-card-title
Sprint 4
:::

::: sprint-card-time
Weeks 7--8
:::

**Epic 5:** Deploy & Harden

**Epic 6:** Refresh Check

✓ Production deployed. Full regression passing.
:::::

::::: {.sprint-card style="background:var(--amber-light)"}
::: {.sprint-card-title style="color:var(--amber)"}
Validation
:::

::: sprint-card-time
Weeks 9--10
:::

**Epic 7:** User Validation

10--15 Persona B interviews.
:::::
::::::::::::::::::
::::::::::::::::::::
:::::::::::::::::::::

::::: {#epics .section .section}
:::: container
::: section-eyebrow
Section 02
:::

## Epics, User Stories & Tasks {#epics-user-stories-tasks .section-title}

Each story is sized in points (1 = half day, 2 = one day, 3 = two days).
Tasks are scoped for a junior developer. [Yellow
rows]{style="background:#fff8e7;padding:1px 6px;border-radius:3px"} are
test stories. MCP/CLI tools noted where applicable.

+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| ID                 | User Story         | Pts                | Tasks (junior-dev scoped)                                         |
+====================+====================+====================+===================================================================+
| EPIC 1 --- Convex Foundation (Sprint 1, Days 1--4)                                                                               |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 1.1                | As a developer, I  | 1                  | - Create a new Convex project (`npx create-convex@latest` or      |
|                    | need a Convex      |                    |   `npx convex init`)                                              |
|                    | project            |                    | - Run `npx convex dev` to start local dev server and confirm      |
|                    | initialized so     |                    |   Dashboard access                                                |
|                    | that all services  |                    | - Create `.env.local` with CONVEX_URL from the dev server         |
|                    | have a backend to  |                    | - Verify `convex/` folder exists with `_generated/` types         |
|                    | connect to.        |                    | - **Tool:** Convex CLI · Convex Dashboard                         |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 1.2                | As a developer, I  | 3                  | - Define `scoring_queue` table: productName, source (union of     |
|                    | need the full      |                    |   literals), priority, requestCount, sourceProductId, status,     |
|                    | schema defined in  |                    |   scoredAt, productId, errorMessage. Indexes:                     |
|                    | `convex/schema.ts` |                    |   `by_status_priority`, `by_productName`                          |
|                    | so that all tables |                    | - Define `products` table: name, brand, upc, emoji, baseScore,    |
|                    | and indexes are    |                    |   tier, status, scoreVersion, scoredAt, refreshConfirmedAt.       |
|                    | enforced.          |                    |   Index: `by_name`                                                |
|                    |                    |                    | - Define `ingredients` table: canonicalName, aliases,             |
|                    |                    |                    |   harmEvidenceScore, regulatoryScore, avoidanceScore, baseScore,  |
|                    |                    |                    |   tier, flagLabel, evidenceSources. Index: `by_canonicalName`     |
|                    |                    |                    | - Define `condition_modifiers` table: ingredientId, condition,    |
|                    |                    |                    |   modifierAmount, evidenceCitation, evidenceQuality, status.      |
|                    |                    |                    |   Indexes: `by_ingredientId`, `by_condition`                      |
|                    |                    |                    | - Define `product_ingredients` junction: productId, ingredientId. |
|                    |                    |                    |   Index: `by_productId`                                           |
|                    |                    |                    | - Run `npx convex dev` and confirm schema pushes without errors   |
|                    |                    |                    | - **Tool:** Convex CLI · Convex Dashboard → Data to verify tables |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 1.3                | As a developer, I  | 2                  | - Write public mutation                                           |
|                    | need core Convex   |                    |   `addToQueue(productName, source, priority)` in                  |
|                    | mutations for      |                    |   `convex/scoringQueue.ts`                                        |
|                    | queue management   |                    | - Implement deduplication: query `by_productName` for existing    |
|                    | so that all three  |                    |   pending/scoring entries. If found, patch requestCount + 1. If   |
|                    | input sources can  |                    |   not, insert                                                     |
|                    | write pending      |                    | - Write internal mutation                                         |
|                    | products.          |                    |   `updateQueueStatus(queueId, status, productId?, errorMessage?)` |
|                    |                    |                    | - Write public query `listQueue(status?)` sorted by priority then |
|                    |                    |                    |   requestCount DESC                                               |
|                    |                    |                    | - **Tool:** Convex CLI · Test via Dashboard → Functions tab       |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 1.4                | As a developer, I  | 2                  | - Write internal mutation `writeProduct(productData)` in          |
|                    | need Convex        |                    |   `convex/products.ts`                                            |
|                    | mutations for      |                    | - Write internal mutation `upsertIngredient(ingredientData)` ---  |
|                    | writing scored     |                    |   query `by_canonicalName`, patch or insert                       |
|                    | products so the    |                    | - Write internal mutation                                         |
|                    | scoring pipeline   |                    |   `linkProductIngredient(productId, ingredientId)`                |
|                    | can persist        |                    | - Write internal mutation `upsertConditionModifier(modifierData)` |
|                    | results.           |                    | - Write public queries `getProduct(name)` and                     |
|                    |                    |                    |   `getProductById(id)`                                            |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 1.5                | As a developer, I  | 2                  | - Set up Convex Auth (or Clerk integration) per Convex auth docs  |
|                    | need auth checks   |                    | - Write helper `requireAdmin(ctx)` that checks getUserIdentity()  |
|                    | in all public      |                    |   for admin role                                                  |
|                    | functions so that  |                    | - Add `requireAdmin(ctx)` to every admin mutation and action      |
|                    | only admins can    |                    | - Consumer-facing queries remain unauthenticated (read-only)      |
|                    | trigger scoring    |                    | - Public `addToQueue` allows unauthenticated calls only for       |
|                    | and writes.        |                    |   source=\"user_request\"                                         |
|                    |                    |                    | - **Tool:** Convex Auth docs · Clerk Dashboard if using Clerk     |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 1.6                | ✅ TESTING: As a   | 3                  | - Set up Vitest (`npm install -D vitest`)                         |
|                    | developer, I need  |                    | - Unit test: insert queue entry via `addToQueue`, verify it       |
|                    | the schema and     |                    |   appears in `listQueue`                                          |
|                    | mutations          |                    | - Unit test: insert duplicate, verify requestCount increments to  |
|                    | validated so we    |                    |   2 (not a new row)                                               |
|                    | can build on a     |                    | - Unit test: insert product via `writeProduct`, verify            |
|                    | solid foundation.  |                    |   `getProduct` returns it                                         |
|                    |                    |                    | - Unit test: `upsertIngredient` inserts new, then patches on      |
|                    |                    |                    |   second call with same canonicalName                             |
|                    |                    |                    | - Unit test: `addToQueue` with source=\"admin_add\" without auth  |
|                    |                    |                    |   throws ConvexError                                              |
|                    |                    |                    | - Unit test: `addToQueue` with source=\"user_request\" without    |
|                    |                    |                    |   auth succeeds                                                   |
|                    |                    |                    | - Manual: verify all five tables in Convex Dashboard with sample  |
|                    |                    |                    |   data                                                            |
|                    |                    |                    | - **Tool:** Vitest · Convex Dashboard                             |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| EPIC 2 --- Bulk Seed Script (Sprint 1, Days 4--8)                                                                                |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 2.1                | As an admin, I     | 3                  | - Write system prompt incorporating full Scoring Algorithm Spec   |
|                    | need a scoring     |                    |   v1.0                                                            |
|                    | prompt template so |                    | - Define JSON output schema with all required fields (name,       |
|                    | the AI produces    |                    |   brand, emoji, baseScore, tier, ingredients\[\],                 |
|                    | consistent,        |                    |   alternatives\[\], conditionModifiers\[\])                       |
|                    | schema-valid JSON. |                    | - Write a zod validator function that validates API responses     |
|                    |                    |                    |   before DB write                                                 |
|                    |                    |                    | - Test prompt against 3--5 sample products via Claude.ai          |
|                    |                    |                    | - **Tool:** Anthropic SDK · Claude Code CLI for prompt iteration  |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 2.2                | As an admin, I     | 3                  | - Create `seed-products.json` with \~500 products from PRD §12    |
|                    | need the bulk seed |                    |   (14 categories)                                                 |
|                    | script to iterate  |                    | - Set up CLI script using `ConvexHttpClient` from                 |
|                    | the 500-product    |                    |   `"convex/browser"`                                              |
|                    | list and call      |                    | - Main loop: for each product, call Claude API with scoring       |
|                    | Claude API for     |                    |   prompt                                                          |
|                    | each one.          |                    | - API params: model=claude-sonnet-4-5, temperature=0,             |
|                    |                    |                    |   max_tokens=1500                                                 |
|                    |                    |                    | - Add 500ms delay between calls. Add `--dry-run` flag             |
|                    |                    |                    | - **Tool:** Anthropic Node SDK · ConvexHttpClient                 |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 2.3                | As an admin, I     | 2                  | - Before each API call, call `getProduct(name)` via               |
|                    | need the seed      |                    |   ConvexHttpClient                                                |
|                    | script to be       |                    | - If found, skip and log \"already scored\"                       |
|                    | resumable so an    |                    | - Write progress log file with timestamps, product name, status   |
|                    | interrupted run    |                    | - Print summary at end: N scored, N skipped, N failed             |
|                    | picks up where it  |                    |                                                                   |
|                    | left off.          |                    |                                                                   |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 2.4                | As an admin, I     | 3                  | - After zod validation, call `writeProduct` mutation via          |
|                    | need valid API     |                    |   ConvexHttpClient                                                |
|                    | responses written  |                    | - For each ingredient, call `upsertIngredient` then               |
|                    | to Convex so the   |                    |   `linkProductIngredient`                                         |
|                    | consumer app can   |                    | - For each condition modifier, call `upsertConditionModifier`     |
|                    | serve them.        |                    | - If any mutation fails, log error and continue to next product   |
|                    |                    |                    | - **Tool:** ConvexHttpClient for calling Convex mutations from    |
|                    |                    |                    |   CLI                                                             |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 2.5                | As an admin, I     | 2                  | - On invalid JSON: retry once with same prompt                    |
|                    | need failed API    |                    | - On second failure: call `addToQueue` with status=failed and     |
|                    | calls handled      |                    |   error message                                                   |
|                    | gracefully so no   |                    | - On API error (rate limit, timeout): wait 5s, retry once         |
|                    | product is lost.   |                    | - On second API error: write to queue as failed                   |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 2.6                | As an admin, I     | 2                  | - After writing a scored product, iterate its alternatives array  |
|                    | need alternatives  |                    | - For each alternative, call `getProduct` to check if it exists   |
|                    | auto-queued so     |                    | - Call `addToQueue` --- deduplication mutation handles existing   |
|                    | database coverage  |                    |   entries                                                         |
|                    | expands            |                    | - Set source=\"alternative\", priority=2,                         |
|                    | organically.       |                    |   sourceProductId=parent\'s \_id                                  |
|                    |                    |                    | - Log count of alternatives queued per product                    |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 2.7                | ✅ TESTING: As a   | 3                  | - Run seed script with `--dry-run` against all 500 products.      |
|                    | developer, I need  |                    |   Verify log output                                               |
|                    | the seed pipeline  |                    | - Run seed against 10 real products. Verify in Dashboard:         |
|                    | validated          |                    |   products, ingredients, modifiers, alternatives queued           |
|                    | end-to-end before  |                    | - Unit test: zod validator rejects response missing required      |
|                    | running the full   |                    |   fields                                                          |
|                    | 500.               |                    | - Unit test: zod validator rejects baseScore outside 1--10 range  |
|                    |                    |                    | - Kill script mid-run, restart. Verify it resumes (skips          |
|                    |                    |                    |   already-scored)                                                 |
|                    |                    |                    | - Verify a failed product lands in scoring_queue with             |
|                    |                    |                    |   status=failed                                                   |
|                    |                    |                    | - Once tests pass, run full 500-product seed. Review run log      |
|                    |                    |                    | - **Tool:** Vitest · Convex Dashboard                             |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| EPIC 3 --- Admin UI (Sprint 2, Weeks 3--4)                                                                                       |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 3.1                | As an admin, I     | 2                  | - Set up React app (Vite or Next.js). Install `convex` and        |
|                    | need a protected   |                    |   configure ConvexProvider                                        |
|                    | login page so only |                    | - Set up auth (Convex Auth or Clerk). Build login page            |
|                    | authorized users   |                    | - Add route guard: redirect to login if no session. Check admin   |
|                    | can access the     |                    |   role                                                            |
|                    | admin interface.   |                    | - **Tool:** Convex Auth or Clerk · Vercel CLI for deploy previews |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 3.2                | As an admin, I     | 3                  | - Build table using `useQuery(api.scoringQueue.listQueue)` ---    |
|                    | need a scoring     |                    |   auto-updates reactively                                         |
|                    | queue view as my   |                    | - Columns: product name, source badge (color-coded),              |
|                    | primary screen to  |                    |   requestCount, \_creationTime, status                            |
|                    | see all pending    |                    | - Pagination (20/page). Failed entries show error message in red  |
|                    | work.              |                    | - Style badges: green=user_request, blue=admin_add,               |
|                    |                    |                    |   amber=alternative                                               |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 3.3                | As an admin, I     | 3                  | - Create Convex action `scoreProduct` in `convex/scoring.ts`      |
|                    | need the Operation |                    | - Action flow: (1) runMutation to set status=\"scoring\", (2)     |
|                    | 2 scoring action   |                    |   call Anthropic API, (3) validate with zod, (4)                  |
|                    | deployed so the UI |                    |   runMutation(writeProduct), (5) runMutation(updateQueueStatus →  |
|                    | can trigger        |                    |   done)                                                           |
|                    | scoring.           |                    | - On failure: runMutation(updateQueueStatus → failed +            |
|                    |                    |                    |   errorMessage). One auto-retry                                   |
|                    |                    |                    | - After success: auto-queue alternatives via                      |
|                    |                    |                    |   runMutation(addToQueue)                                         |
|                    |                    |                    | - Store API key: `npx convex env set ANTHROPIC_API_KEY`           |
|                    |                    |                    | - **Tool:** Anthropic SDK · Convex CLI for env vars               |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 3.4                | As an admin, I     | 2                  | - Add \"Score Now\" button to each pending row                    |
|                    | need a \"Score     |                    | - On click, call the `scoreProduct` action. Row status updates    |
|                    | Now\" button on    |                    |   reactively (pending → scoring → done)                           |
|                    | each queue entry   |                    | - On failure, row shows error + \"Retry\" button                  |
|                    | to trigger         |                    |                                                                   |
|                    | Operation 2        |                    |                                                                   |
|                    | inline.            |                    |                                                                   |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 3.5                | As an admin, I     | 1                  | - Text input + \"Add\" button above queue table                   |
|                    | need an \"Add to   |                    | - On submit, call `addToQueue` mutation with                      |
|                    | Queue\" input to   |                    |   source=\"admin_add\", priority=3                                |
|                    | proactively add    |                    | - Show toast (success or duplicate info). Queue auto-refreshes    |
|                    | products.          |                    |   reactively                                                      |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 3.6                | As an admin, I     | 3                  | - Searchable list page querying products by name                  |
|                    | need a product     |                    | - Columns: name, brand, baseScore, tier (color-coded), scoredAt   |
|                    | database browser   |                    | - Product detail panel: ingredients (via by_productId) +          |
|                    | to review scored   |                    |   condition_modifiers (via by_ingredientId)                       |
|                    | records.           |                    | - Tier filter buttons: Clean / Watch / Caution / Avoid            |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 3.7                | As an admin, I     | 3                  | - \"Score Next N\" button + number input (default 10)             |
|                    | need \"Score Next  |                    | - Fetch top N pending entries. Process sequentially via scoring   |
|                    | N\" to             |                    |   action or ctx.scheduler                                         |
|                    | batch-process the  |                    | - Show progress: \"Scoring 3/10\...\" (reactive updates as        |
|                    | alternative queue. |                    |   statuses change)                                                |
|                    | (P1)               |                    | - Completion summary: N scored, N failed                          |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 3.8                | ✅ TESTING: As a   | 3                  | - Unit test: scoreProduct with mocked API response writes         |
|                    | developer, I need  |                    |   product, ingredients, modifiers                                 |
|                    | the admin UI and   |                    | - Unit test: scoreProduct with invalid JSON marks queue entry as  |
|                    | scoring action     |                    |   failed                                                          |
|                    | validated before   |                    | - Unit test: scoreProduct auto-queues alternatives after success  |
|                    | building the       |                    | - Manual E2E: login → view queue → \"Score Now\" → verify score   |
|                    | consumer app.      |                    |   appears                                                         |
|                    |                    |                    | - Manual E2E: \"Add to Queue\" → verify entry appears             |
|                    |                    |                    | - Manual E2E: \"Score Next N\" × 5 entries → verify all complete  |
|                    |                    |                    | - Manual E2E: product browser → search → verify detail panel      |
|                    |                    |                    | - **Tool:** Vitest · Playwright MCP if time permits               |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| EPIC 4 --- Consumer App --- Core Loop (Sprint 3, Weeks 5--6)                                                                     |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 4.1                | As a user, I want  | 3                  | - Chat-style onboarding: motivation, conditions, sensitivities (3 |
|                    | to complete a      |                    |   stepped screens)                                                |
|                    | guided onboarding  |                    | - Step 1: \"What brings you to CleanList?\" --- multi-select      |
|                    | flow so the app    |                    | - Step 2: \"Any conditions?\" --- multi-select (ADHD, IBS,        |
|                    | knows my health    |                    |   pregnancy, thyroid, eczema, none)                               |
|                    | profile.           |                    | - Step 3: \"Any sensitivities?\" --- multi-select (migraines, gut |
|                    |                    |                    |   sensitivity, food allergies, none)                              |
|                    |                    |                    | - Save to localStorage:                                           |
|                    |                    |                    |   `{ motivation, conditions[], sensitivities[] }`                 |
|                    |                    |                    | - Summary screen with profile pills                               |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 4.2                | As a user, I want  | 3                  | - Shopping list screen with search input + \"Add\" button         |
|                    | to search for a    |                    | - On submit, `useQuery(api.products.getProduct, { name })` ---    |
|                    | product and add it |                    |   reactive lookup                                                 |
|                    | to my list to see  |                    | - Hit → add to local list, display score instantly                |
|                    | its score.         |                    | - Miss → \"Not yet scored\" + \"Request this product\" button     |
|                    |                    |                    | - Request button calls `addToQueue` mutation                      |
|                    |                    |                    |   (source=\"user_request\", priority=1)                           |
|                    |                    |                    | - Reactive: if product gets scored later, UI auto-updates --- no  |
|                    |                    |                    |   refresh needed                                                  |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 4.3                | As a user, I want  | 2                  | - List item: emoji, name, brand, score badge (color-coded), tier  |
|                    | to see each        |                    |   label                                                           |
|                    | product\'s score   |                    | - Clean=green, Watch=amber, Caution=orange, Avoid=red             |
|                    | and tier on my     |                    | - If personalScore \> baseScore, show crossed-out base next to    |
|                    | list.              |                    |   personal                                                        |
|                    |                    |                    | - Modifier tags below item: \"+2.8 ADHD --- Red No. 40\"          |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 4.4                | As a user, I want  | 3                  | - Write                                                           |
|                    | my personal score  |                    |   `getPersonalScore(product, ingredientIds, modifiers, profile)`  |
|                    | calculated         |                    |   utility                                                         |
|                    | client-side so my  |                    | - Fetch product_ingredients (by_productId) + condition_modifiers  |
|                    | health data never  |                    |   (by_ingredientId) via useQuery                                  |
|                    | leaves my device.  |                    | - Filter modifiers by profile conditions/sensitivities from       |
|                    |                    |                    |   localStorage                                                    |
|                    |                    |                    | - Sum applicable modifierAmounts + baseScore. Cap at 10.0.        |
|                    |                    |                    |   Determine personal tier                                         |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 4.5                | As a user, I want  | 3                  | - Detail sheet: name, brand, base score, personal score, tier     |
|                    | to tap a product   |                    |   badge                                                           |
|                    | and see its full   |                    | - Modifier breakdown: tags with condition, ingredient, boost,     |
|                    | detail.            |                    |   evidence citation (on tap)                                      |
|                    |                    |                    | - Ingredient list: each with score, tier dot, flag label. Sort by |
|                    |                    |                    |   score desc (worst first)                                        |
|                    |                    |                    | - Alternatives section at bottom with swap options                |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 4.6                | As a user, I want  | 2                  | - \"Swap\" button on best alternative in detail view              |
|                    | to tap \"Swap\" to |                    | - On tap, replace product in shopping list with alternative       |
|                    | replace a          |                    | - If alternative in DB (reactive query), load score immediately.  |
|                    | concerning product |                    |   Otherwise show \"Scoring\...\"                                  |
|                    | with a cleaner     |                    | - Brief swap animation/transition                                 |
|                    | one.               |                    |                                                                   |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 4.7                | As a user, I want  | 1                  | - Profile pill showing active condition count                     |
|                    | a profile pill in  |                    | - Tap → profile settings panel with edit/toggle controls          |
|                    | the top bar to     |                    | - Changes recalculate personal scores for all list items          |
|                    | see/edit my active |                    |   immediately                                                     |
|                    | settings.          |                    |                                                                   |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 4.8                | ✅ TESTING: As a   | 3                  | - Unit test: getPersonalScore --- base 4.5 + ADHD 2.8 + IBS 0.4 = |
|                    | developer, I need  |                    |   7.7, tier Caution                                               |
|                    | the consumer app   |                    | - Unit test: getPersonalScore --- capped at 10.0 when modifiers   |
|                    | validated          |                    |   exceed                                                          |
|                    | end-to-end before  |                    | - Unit test: getPersonalScore --- no modifiers when profile has   |
|                    | deployment.        |                    |   no matching conditions                                          |
|                    |                    |                    | - E2E test: complete onboarding (ADHD + IBS), verify localStorage |
|                    |                    |                    | - E2E test: search for Froot Loops (known product), verify base + |
|                    |                    |                    |   personal scores                                                 |
|                    |                    |                    | - E2E test: search for unknown product → \"Not yet scored\" →     |
|                    |                    |                    |   queue write                                                     |
|                    |                    |                    | - E2E test: swap product with alternative, verify list updates    |
|                    |                    |                    | - E2E test: edit profile (remove ADHD), verify scores recalculate |
|                    |                    |                    | - **Tool:** Vitest · Playwright MCP                               |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| EPIC 5 --- Deploy & Harden (Sprint 4, Week 7)                                                                                    |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 5.1                | As a user, I want  | 1                  | - Add disclosure to onboarding summary: \"Scores are AI-generated |
|                    | the app to show an |                    |   using peer-reviewed evidence and regulatory data. Independent   |
|                    | MVP disclosure so  |                    |   expert review coming soon.\"                                    |
|                    | I understand       |                    | - Add same text to About screen accessible from settings          |
|                    | scores are         |                    |                                                                   |
|                    | AI-generated.      |                    |                                                                   |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 5.2                | As a developer, I  | 2                  | - Run `npx convex deploy` to push Convex functions + schema to    |
|                    | need to deploy the |                    |   production                                                      |
|                    | consumer app and   |                    | - Set production env vars:                                        |
|                    | admin UI to        |                    |   `npx convex env set ANTHROPIC_API_KEY <key> --prod`             |
|                    | production.        |                    | - Set up Vercel project for consumer app with                     |
|                    |                    |                    |   NEXT_PUBLIC_CONVEX_URL = production URL                         |
|                    |                    |                    | - Set up Vercel project (or route) for admin UI. Run smoke tests  |
|                    |                    |                    | - **Tool:** Convex CLI · Vercel CLI                               |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 5.3                | As an admin, I     | 2                  | - Use \"Score Next N\" in batches of 50                           |
|                    | need to process    |                    | - Review and resolve failed entries                               |
|                    | the alternative    |                    | - Verify product count in Dashboard (target: 1000--1500)          |
|                    | queue so coverage  |                    | - Spot-check 20 products across tiers                             |
|                    | expands before     |                    |                                                                   |
|                    | interviews.        |                    |                                                                   |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 5.4                | ✅ TESTING: Full   | 3                  | - Run all unit tests (Vitest) --- confirm all pass                |
|                    | regression test    |                    | - Run E2E suite against production: onboarding, search, score,    |
|                    | against production |                    |   miss state, swap                                                |
|                    | before user        |                    | - E2E: admin login → view queue → score product → verify in       |
|                    | interviews.        |                    |   consumer app (reactive)                                         |
|                    |                    |                    | - E2E: user requests product → admin scores it → user\'s view     |
|                    |                    |                    |   updates reactively                                              |
|                    |                    |                    | - Manual: verify \< 400ms latency for DB-hit products             |
|                    |                    |                    | - Manual: verify unauthenticated user cannot access admin or      |
|                    |                    |                    |   trigger scoring                                                 |
|                    |                    |                    | - **Tool:** Vitest · Playwright MCP · Convex Dashboard            |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| EPIC 6 --- Refresh Check / Operation 3 (Sprint 4, Week 8)                                                                        |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 6.1                | As an admin, I     | 3                  | - Create Convex action `refreshCheck` in `convex/scoring.ts`      |
|                    | need the Refresh   |                    | - Query all products where status=\"scored\"                      |
|                    | Check action to    |                    | - For each: call Claude API with diff-mode prompt (return         |
|                    | re-evaluate all    |                    |   {change: false} or changed fields + reason)                     |
|                    | scored products.   |                    | - No change → mutation updates refreshConfirmedAt. Change →       |
|                    |                    |                    |   mutation updates product, increments scoreVersion               |
|                    |                    |                    | - Use `ctx.scheduler.runAfter` to batch and avoid action timeout  |
|                    |                    |                    | - **Tool:** Anthropic SDK · Convex scheduler                      |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 6.2                | As an admin, I     | 2                  | - \"Run Refresh Check\" button in admin UI                        |
|                    | need a Refresh     |                    | - Show progress via reactive query on refreshConfirmedAt          |
|                    | Trigger button in  |                    | - Completion summary: N unchanged, N updated, N failed            |
|                    | the admin UI.      |                    | - Optional category/tier filter for subset refresh                |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 6.3                | ✅ TESTING:        | 2                  | - Unit test: refreshCheck with mocked {change: false} → updates   |
|                    | Validate the       |                    |   refreshConfirmedAt, not scoreVersion                            |
|                    | refresh check      |                    | - Unit test: refreshCheck with change → updates fields and        |
|                    | before relying on  |                    |   increments scoreVersion                                         |
|                    | it for regulatory  |                    | - Manual: run refresh on 10 products, verify timestamps in        |
|                    | updates.           |                    |   Dashboard                                                       |
|                    |                    |                    | - Manual: verify a tier change shows updated tier in consumer app |
|                    |                    |                    | - **Tool:** Vitest · Convex Dashboard                             |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| EPIC 7 --- User Validation (Weeks 9--10)                                                                                         |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 7.1                | As a PM, I need    | 3                  | - Recruit 10--15 participants (health-motivated grocery shoppers) |
|                    | 10--15 Persona B   |                    | - Prepare interview script: onboarding, score trust, swap         |
|                    | interviews to      |                    |   acceptance, \"not yet scored\" reaction, willingness to pay     |
|                    | validate score     |                    | - Conduct interviews with the live app                            |
|                    | trust and          |                    | - Note products that returned miss results --- prioritize in      |
|                    | willingness to     |                    |   queue                                                           |
|                    | pay.               |                    | - Compile validation report                                       |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 7.2                | As a PM, I need a  | 2                  | - Document top 5 user-requested features/pain points              |
|                    | prioritized        |                    | - Prioritize: barcode scanning, paywall, profile management,      |
|                    | post-MVP backlog   |                    |   feedback nudges, advisor review                                 |
|                    | based on           |                    | - Write initial user stories for top 3 post-MVP items             |
|                    | validation         |                    | - Create Linear issues for backlog                                |
|                    | findings.          |                    | - **Tool:** Linear MCP server                                     |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
| 7.3                | ✅ TESTING: Turn   | 1                  | - For each user-reported issue, write a failing test case or      |
|                    | validation         |                    |   acceptance criterion                                            |
|                    | findings into      |                    | - For score-trust concerns, log specific products for advisor     |
|                    | concrete           |                    |   review queue                                                    |
|                    | acceptance         |                    | - Update test suite with edge cases discovered during interviews  |
|                    | criteria for       |                    |                                                                   |
|                    | post-MVP.          |                    |                                                                   |
+--------------------+--------------------+--------------------+-------------------------------------------------------------------+
::::
:::::

::::: {#tooling .section .section}
:::: container
::: section-eyebrow
Section 03
:::

## MCP Server & CLI Tool Reference {#mcp-server-cli-tool-reference .section-title}

  Tool                   Type                      Install / Connect                            Primary Use                                     Stories
  ---------------------- ------------------------- -------------------------------------------- ----------------------------------------------- -----------------------------------
  **Convex CLI**         [npx convex]{.tool-tag}   `npm install convex`                         Local dev, schema push, deploy, env vars        1.1--1.6, 2.2--2.7, 3.3, 5.2, 6.1
  **Convex Dashboard**   Web UI                    dashboard.convex.dev                         Data inspection, function logs, monitoring      1.2, 1.6, 2.7, 3.8, 5.4, 6.3
  **Anthropic SDK**      [npm]{.tool-tag}          `npm install @anthropic-ai/sdk`              Claude API calls from actions and CLI           2.1--2.5, 3.3, 6.1
  **Claude Code**        [CLI]{.tool-tag}          `npm install -g @anthropic-ai/claude-code`   Agentic coding, prompt iteration                All (dev workflow)
  **Vitest**             [npm]{.tool-tag}          `npm install -D vitest`                      Unit testing for functions, validators, utils   1.6, 2.7, 3.8, 4.8, 5.4, 6.3
  **Playwright MCP**     MCP Server                `npm install -D playwright`                  E2E browser testing                             3.8, 4.8, 5.4
  **Linear MCP**         MCP Server                Claude.ai → Connected Tools                  Sprint tasks, issue tracking                    7.2, planning
  **GitHub CLI**         [gh]{.tool-tag}           `brew install gh`                            Branches, PRs, code review                      All (source control)
  **Vercel CLI**         [npx vercel]{.tool-tag}   `npm install -g vercel`                      Frontend deploys                                3.1, 5.2
::::
:::::

::::: {#dod .section .section}
:::: container
::: section-eyebrow
Section 04
:::

## Definition of Done {#definition-of-done .section-title}

Every story is considered complete when:

- Code is committed to a feature branch and reviewed via PR.
- Convex schema pushes cleanly (`npx convex dev` shows no errors).
- Auth checks tested: unauthenticated calls to admin functions throw
  ConvexError.
- API responses validated against zod schema before any DB write.
- Unit tests pass for utility functions, mutations, and queries
  (Vitest).
- Feature deployed to a Vercel preview URL and smoke-tested.
- **The epic\'s test story is complete before starting the next epic.**

### Testing Strategy Summary

Testing is distributed across every epic, not batched at the end. Three
layers:

**Unit tests (Vitest):** Convex mutations, queries, zod validator,
getPersonalScore utility. Run in CI on every PR. Stories: 1.6, 2.7, 3.8,
4.8, 6.3.

**E2E tests (Playwright):** Full user journeys --- onboarding, search,
score, miss, swap, admin flow. Run against previews. Stories: 3.8, 4.8,
5.4.

**Manual verification:** Convex Dashboard inspection after each epic for
data integrity, index verification, and latency checks. Every test story
includes at least one manual task.
::::
:::::

::::: {#post-mvp .section .section}
:::: container
::: section-eyebrow
Section 05
:::

## Post-MVP Backlog (Not in Scope) {#post-mvp-backlog-not-in-scope .section-title}

- Scientific advisor review workflow (pending_review status, advisor UI,
  reviewed vs. AI-only labels)
- Barcode scanning (camera-based UPC lookup)
- Paywall and subscription management
- Profile management with feedback nudges and life-stage prompts
- User notifications on tier change for saved products
- Target API / product catalog integration for \"available at your
  store\" feature
::::
:::::

CleanList · Project Delivery Plan · March 2026 · Confidential --- for
partner review only
