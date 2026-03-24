# CleanList — Delivery Plan v3.0

> **Project Delivery Plan · v3.0 · March 2026 · Confidential — for partner review only**

| | |
|---|---|
| **Foundation** | v2 Epics 1–6 complete ✓ |
| **New Epics** | 8 (incl. validation) |
| **Sprints** | 4 × 2 weeks + validation |
| **Backend** | Convex (existing) |

---

> ✅ **Already built (v2 Epics 1–6):** Convex project, initial schema, bulk seed (500 products), admin UI (queue view, product browser, Score Now, Score Next N), consumer app (onboarding, list, scoring, detail, swap), deployment, refresh check. **Not yet completed:** user validation interviews (Epic 7 deferred — will be this plan's final epic after migration).

---

## 1. Sprint Plan Overview

Eight epics across four sprints, building on the existing v2 foundation. Each epic includes a testing story (marked with ✅). The migration can be done incrementally — the existing consumer app stays live while the new pipeline is built alongside it.

| Sprint | Timeline | Epics | Milestone |
|---|---|---|---|
| **Sprint 1** | Weeks 1–2 | Epic 1: Schema Migration & Auth · Epic 2: Ingredient Extraction Pipeline | New tables live. Auth working. OFF integration returning ingredient lists. |
| **Sprint 2** | Weeks 3–4 | Epic 3: Ingredient Scoring Pipeline · Epic 4: Product Assembly Engine | Ingredients scoring via queue. Products auto-assembling. Partial scores working. |
| **Sprint 3** | Weeks 5–6 | Epic 5: Consumer App Migration · Epic 6: Admin UI Migration | Consumer app on auth + new pipeline. Admin working ingredient queue. |
| **Sprint 4** | Weeks 7–8 | Epic 7: Alternatives + Re-seed | Alternatives pipeline live. 500 products re-seeded through new pipeline. |
| **Validation** | Weeks 9–10 | Epic 8: User Validation | 10–15 Persona B interviews. Score trust and willingness-to-pay validated. |

**Testing convention:** Test stories are marked with ✅ throughout this document. Each epic's test story validates the work completed in that epic before the next epic begins.

---

## 2. Epics, User Stories & Tasks

Points: 1 = half day, 2 = one day, 3 = two days. All tasks scoped for a junior developer. Test stories marked with ✅.

---

### EPIC 1 — Schema Migration & Auth (Sprint 1, Days 1–5)

#### 1.1 — New tables in convex/schema.ts (3 pts)

*As a developer, I need the new tables added to convex/schema.ts so the ingredient-first pipeline has a data layer.*

- Add `ingredient_queue` table: canonicalName, status, priority, requestCount, blockedProductIds, ingredientId, errorMessage. Indexes: `by_status_priority`, `by_canonicalName`
- Add `user_profiles` table: userId, motivation, conditions (array), sensitivities (array). Index: `by_userId`
- Add `alternatives_queue` table: productId, status, alternatives (optional array of objects)
- Update `products` table: add `assemblyStatus` ("complete"|"partial"|"pending_ingredients"), `pendingIngredientCount`, `worstIngredientId`, `ingredientSource`. Make baseScore and tier optional (null when pending)
- Add `scoreVersion` and `scoredAt` fields to `ingredients` table if not present
- Run `npx convex dev` — confirm schema pushes cleanly
- **Tool:** Convex CLI · Convex Dashboard to verify tables

#### 1.2 — User auth (3 pts)

*As a developer, I need user auth wired up so that consumers must log in before onboarding.*

- Set up Convex Auth (or Clerk) with email + Google social login
- Configure auth providers in Convex dashboard / Clerk dashboard
- Add auth gate to consumer app: unauthenticated users see login/signup screen only
- Write mutation `createOrUpdateProfile(motivation, conditions, sensitivities)` that upserts into `user_profiles` keyed by auth userId
- Write query `getMyProfile()` that fetches the current user's profile
- Update onboarding flow: on completion, call createOrUpdateProfile mutation AND cache to localStorage
- **Tool:** Convex Auth docs · Clerk dashboard if using Clerk

#### 1.3 — Ingredient queue mutations (2 pts)

*As a developer, I need ingredient queue mutations so unscored ingredients can be tracked and processed.*

- Write mutation `addToIngredientQueue(canonicalName, priority, blockedProductId)` with deduplication — if already queued, increment requestCount and append to blockedProductIds
- Write internal mutation `updateIngredientQueueStatus(queueId, status, ingredientId?, errorMessage?)`
- Write query `listIngredientQueue(status?)` sorted by priority then requestCount DESC
- **Tool:** Convex CLI · Test via Dashboard → Functions

#### ✅ 1.4 — TESTING: Schema, auth, and queue mutations (2 pts)

- Unit test: all seven tables visible in Convex Dashboard with correct fields
- Unit test: createOrUpdateProfile creates a profile, then updates on second call (upsert)
- Unit test: addToIngredientQueue creates entry, then deduplicates on second call
- Unit test: unauthenticated call to createOrUpdateProfile throws error
- Manual: log in with email, complete onboarding, verify profile appears in user_profiles table
- **Tool:** Vitest · Convex Dashboard

---

### EPIC 2 — Ingredient Extraction Pipeline (Sprint 1, Days 5–10)

#### 2.1 — Open Food Facts integration (3 pts)

*As a developer, I need an Open Food Facts integration so we can get ingredient lists without AI.*

- Write a Convex action `extractIngredients(productName, brand)` in `convex/extraction.ts`
- Step 1: Search Open Food Facts API by product name/brand (`https://world.openfoodfacts.org/cgi/search.pl`)
- Parse the ingredient list from the OFF response. Normalize ingredient names (lowercase, trim, strip parentheticals)
- If OFF returns results, set `ingredientSource = "open_food_facts"`
- If OFF misses, fall back to AI call: "List all ingredients in [product name] by [brand]. Return JSON array of ingredient names."
- Set `ingredientSource = "ai_extraction"` for AI fallback
- Return the normalized ingredient list
- **Tool:** Open Food Facts API (free, no key) · Anthropic SDK for fallback

#### 2.2 — Extraction result processing (3 pts)

*As a developer, I need the extraction result to create/link ingredient records and identify which need scoring.*

- Write mutation `processExtractionResult(productId, ingredientNames[], source)`
- For each ingredient name: query `ingredients` table by canonicalName (and aliases). If found, link via `product_ingredients`
- If not found: create a placeholder ingredient record (no scores yet) and link it. Add to `ingredient_queue` with the productId in blockedProductIds
- Update product's `pendingIngredientCount` with the count of unscored ingredients
- Set product's `assemblyStatus`: "complete" if 0 pending, "pending_ingredients" otherwise
- If assemblyStatus is "complete", trigger product assembly immediately (call assembleProductScore mutation)

#### ✅ 2.3 — TESTING: Extraction pipeline (2 pts)

- Unit test: extractIngredients("Cheerios", "General Mills") returns ingredient list from OFF
- Unit test: extractIngredients for an obscure product falls back to AI and returns list
- Unit test: processExtractionResult with all-known ingredients sets assemblyStatus="complete"
- Unit test: processExtractionResult with unknown ingredients creates queue entries with correct blockedProductIds
- Manual: run extraction for 5 products in Dashboard, verify product_ingredients and queue entries
- **Tool:** Vitest · Convex Dashboard

---

### EPIC 3 — Ingredient Scoring Pipeline (Sprint 2, Weeks 3–4)

#### 3.1 — Ingredient scoring prompt (3 pts)

*As an admin, I need a focused ingredient scoring prompt so the AI evaluates one ingredient rigorously.*

- Write system prompt for ingredient scoring: "Score this individual ingredient on three dimensions. Cite evidence for each." Include the full evidence hierarchy, regulatory tier system, and action multipliers from the Scoring Algorithm Spec
- Define JSON output schema: `{ canonicalName, aliases[], harmEvidenceScore, regulatoryScore, avoidanceScore, baseScore, tier, flagLabel, evidenceSources, conditionModifiers[{condition, amount, citation, quality}] }`
- Write zod validator for the response
- Test against 5 ingredients manually (Red No. 40, BHT, sugar, water, sodium benzoate)
- **Tool:** Anthropic SDK · Claude Code for prompt iteration

#### 3.2 — Ingredient scoring action (3 pts)

*As an admin, I need the ingredient scoring action deployed so the queue can be processed.*

- Write Convex action `scoreIngredient(queueId)` in `convex/scoring.ts`
- Action: (1) runMutation to set queue status="scoring", (2) call Claude API with ingredient prompt, (3) validate with zod, (4) runMutation to write/update ingredient record with all scores + modifiers, (5) runMutation to set queue status="done" with ingredientId
- On failure: runMutation to set status="failed" + errorMessage. One auto-retry
- After success: runMutation to write condition_modifiers for this ingredient
- **Critical:** After scoring, trigger auto-assembly for all products in `blockedProductIds` (decrement their pendingIngredientCount, if 0 → assemble)
- **Tool:** Anthropic SDK · Convex CLI for env vars

#### 3.3 — Score Now and Score Next N for ingredient queue (2 pts)

*As a developer, I need "Score Now" and "Score Next N" wired to the ingredient queue.*

- Update admin UI queue view to use `listIngredientQueue` instead of the old product queue
- "Score Now" button calls the `scoreIngredient` action with the queueId
- "Score Next N" processes top N pending ingredient entries sequentially
- Show `requestCount` prominently — higher = more products blocked on this ingredient

#### ✅ 3.4 — TESTING: Ingredient scoring and auto-assembly trigger (3 pts)

- Unit test: scoreIngredient with mocked API writes correct fields to ingredients table
- Unit test: scoreIngredient writes condition_modifiers for the ingredient
- Unit test: after scoring, all products in blockedProductIds have pendingIngredientCount decremented
- Unit test: when pendingIngredientCount reaches 0, assemblyStatus flips to "complete" and product score is assembled
- Unit test: scoring one ingredient (e.g., "Red No. 40") unblocks multiple products simultaneously
- Manual: score 3 ingredients via admin UI, verify products auto-assemble in Dashboard
- **Tool:** Vitest · Convex Dashboard · Playwright MCP if time permits

---

### EPIC 4 — Product Assembly Engine (Sprint 2, continued)

#### 4.1 — Weighted-worst assembly formula (3 pts)

*As a developer, I need the weighted-worst assembly formula implemented as a Convex mutation.*

- Write mutation `assembleProductScore(productId)` in `convex/assembly.ts`
- Fetch all ingredient IDs via product_ingredients (by_productId index)
- Fetch all ingredient records. Find the max score (worst ingredient)
- For each additional ingredient with score ≥ 4.0: calculate penalty = 0.1 + (score - 4.0) × 0.1
- Product Base Score = max + sum of penalties, capped at 10.0
- Derive tier from score. Set assemblyStatus="complete", update worstIngredientId
- Write a pure function `calculateProductScore(ingredientScores[])` that can be unit tested independently
- **Tool:** Convex CLI

#### 4.2 — Partial score assembly (2 pts)

*As a developer, I need partial score assembly so users see progress while ingredients are pending.*

- Update assembleProductScore to handle partial assembly: only use scored ingredients
- Set assemblyStatus="partial" when some ingredients are still pending
- Store the partial score in baseScore with a flag distinguishing it from a final score
- When the last pending ingredient is scored, re-run assembly to produce the final score

#### 4.3 — Server-side personalization (3 pts)

*As a developer, I need server-side personalization so the query returns both base and personal scores.*

- Write query `getPersonalizedProduct(productId)` that returns base score + personal score
- Fetch user profile via `ctx.auth` → user_profiles by_userId
- Fetch all ingredients for the product, then all condition_modifiers for those ingredients
- Filter modifiers where modifier.condition is in user's conditions or sensitivities
- Personal Score = baseScore + sum(matched modifiers), capped at 10.0
- Return: `{ baseScore, personalScore, tier, personalTier, modifiers[], ingredients[], assemblyStatus, pendingCount }`
- This is reactive — updates automatically when scores change

#### ✅ 4.4 — TESTING: Assembly formula and personalization (3 pts)

- Unit test: `calculateProductScore([6.3, 5.8, 5.5, 2.1, 1.0])` = 6.83 (Froot Loops example)
- Unit test: `calculateProductScore([2.0, 1.5, 1.0])` = 2.0 (all clean — no penalties)
- Unit test: `calculateProductScore([9.5, 8.0, 7.5, 6.0])` caps at 10.0
- Unit test: `calculateProductScore([4.0])` = 4.0 (single flagged, no additional penalty)
- Unit test: partial assembly with 3/5 ingredients scored produces a partial score
- Unit test: getPersonalizedProduct for ADHD user + Red No. 40 product adds modifier correctly
- Unit test: getPersonalizedProduct for user with no matching conditions returns baseScore == personalScore
- Unit test: personal score caps at 10.0
- **Tool:** Vitest

---

### EPIC 5 — Consumer App Migration (Sprint 3, Weeks 5–6)

#### 5.1 — Auth gate (2 pts)

*As a user, I need to sign up / log in before I can use the app.*

- Add auth gate as the first screen — email + Google social login
- After auth, check if user_profiles exists for this userId. If yes → go to list. If no → go to onboarding
- Update onboarding to write profile to Convex AND localStorage cache
- On app load, hydrate profile from localStorage (fast), then sync from Convex (source of truth)

#### 5.2 — Instant scores and pending states (3 pts)

*As a user, I want instant scores when I add a product with all-known ingredients.*

- Update "Add product" flow: on submit, call extractIngredients action, then processExtractionResult mutation
- If assemblyStatus == "complete" → product score appears instantly (reactive query)
- If assemblyStatus == "pending_ingredients" → show "Scoring in progress — X of Y ingredients pending"
- If assemblyStatus == "partial" → show partial score with disclaimer badge
- Use `useQuery(api.assembly.getPersonalizedProduct, { productId })` — reactive updates when ingredients get scored

#### 5.3 — Worst ingredient visibility (2 pts)

*As a user, I want to see which ingredient is driving my product's score.*

- Update product detail view to show `worstIngredientId` highlighted as "Primary concern"
- Show ingredient list sorted by score descending with individual tier dots
- Show modifier breakdown: which conditions triggered which ingredient modifiers
- For partial scores, show pending ingredients grayed out with "Pending" label

#### 5.4 — Profile-driven recalculation (2 pts)

*As a user, I want my profile changes to immediately recalculate all my product scores.*

- Profile edit screen writes to Convex (createOrUpdateProfile) and localStorage
- Because getPersonalizedProduct reads the profile reactively, all product scores update automatically when the profile changes
- Show a brief recalculation animation on the shopping list when profile is updated

#### ✅ 5.5 — TESTING: Consumer flow on new pipeline (3 pts)

- E2E: sign up with email → complete onboarding → verify profile in Convex
- E2E: add a product with all-known ingredients → verify instant score (< 200ms)
- E2E: add a product with unknown ingredients → verify "Scoring in progress" with pending count
- E2E: admin scores a pending ingredient → verify consumer's partial score updates reactively
- E2E: edit profile (add ADHD) → verify personal scores recalculate across all products
- E2E: product detail shows worst ingredient highlighted and modifier breakdown
- **Tool:** Playwright MCP · Vitest

---

### EPIC 6 — Admin UI Migration (Sprint 3, continued)

#### 6.1 — Ingredient queue view (2 pts)

*As an admin, I need the queue view switched to the ingredient queue.*

- Replace the product queue view with ingredient queue: `useQuery(api.ingredientQueue.listIngredientQueue)`
- Columns: ingredient name, requestCount (# products blocked), priority, status
- "Score Now" calls `scoreIngredient` action. "Score Next N" for batch
- Show badge: "Blocks 7 products" next to requestCount for visibility

#### 6.2 — Ingredient browser (2 pts)

*As an admin, I need an ingredient browser to review the scored ingredient database.*

- Build searchable ingredient list: canonicalName, three dimension scores, baseScore, tier
- Click to see detail: evidence sources, condition_modifiers, aliases, which products use this ingredient
- Tier filter and sort options

#### 6.3 — Product browser with assembly status (2 pts)

*As an admin, I need the product browser updated to show assembly status.*

- Update product list to show assemblyStatus column (complete / partial / pending)
- Filter by assembly status so admin can see which products are blocked
- Product detail shows ingredient breakdown with scored vs. pending ingredients
- Show ingredientSource badge (Open Food Facts / AI / Manual)

#### ✅ 6.4 — TESTING: Admin UI migration (2 pts)

- Manual: view ingredient queue, score an ingredient, verify products unblock
- Manual: use Score Next N to batch-process 10 ingredients, verify completion
- Manual: browse ingredients, verify detail panel shows modifiers and linked products
- Manual: browse products filtered by "pending_ingredients", verify pending count is accurate
- **Tool:** Convex Dashboard · Playwright MCP

---

### EPIC 7 — Alternatives + Re-seed (Sprint 4, Weeks 7–8)

#### 7.1 — Alternatives pipeline (3 pts)

*As a developer, I need the alternatives pipeline as a separate lightweight AI call.*

- Write Convex action `suggestAlternatives(productId)`
- Fetch product name, brand, tier. Call Claude: "Given [product] ([tier]), suggest 2–3 cleaner alternatives in the same category. Return JSON."
- Write result to alternatives_queue (status="done", alternatives array)
- Store alternative names — if they're products already in the DB, link them. Otherwise just store name + brand + reason
- Trigger: auto-queue an alternatives call whenever a product reaches assemblyStatus="complete"
- **Tool:** Anthropic SDK

#### 7.2 — Re-seed 500 products (3 pts)

*As a developer, I need to re-seed 500 products through the new ingredient-first pipeline.*

- Write a CLI re-seed script using ConvexHttpClient
- For each product: call extractIngredients → processExtractionResult
- Collect all unique unscored ingredients across all 500 products
- Log: "500 products extracted. N unique ingredients found. M already scored. K need scoring."
- Score the K new ingredients (using scoreIngredient action for each)
- Verify all 500 products auto-assemble once their ingredients are complete
- Queue alternatives for all 500 products
- **Tool:** ConvexHttpClient · Anthropic SDK

#### 7.3 — Ingredient-level refresh check (2 pts)

*As a developer, I need ingredient refresh check updated for the new pipeline.*

- Update Operation 3 (refresh) to work at the ingredient level, not product level
- For each ingredient: diff-mode AI call. If changed → update ingredient → re-assemble all products using that ingredient
- One ingredient refresh can cascade to many product score updates
- Use Convex scheduler for batching

#### ✅ 7.4 — TESTING: Re-seed, alternatives, and refresh (3 pts)

- Run re-seed against 20 products. Verify: ingredient deduplication works, products auto-assemble, alternatives queued
- Count unique ingredients vs. total ingredient references — confirm significant deduplication
- Unit test: suggestAlternatives returns valid JSON with 2–3 alternatives
- Unit test: ingredient refresh with a score change triggers product re-assembly for all linked products
- Run full 500-product re-seed. Spot-check 20 products across tiers. Compare scores to v2 (should be similar but more consistent)
- **Tool:** Vitest · Convex Dashboard

---

### EPIC 8 — User Validation (Weeks 9–10)

#### 8.1 — Persona B interviews (3 pts)

*As a PM, I need 10–15 Persona B interviews to validate score trust and willingness to pay.*

- Recruit 10–15 participants (health-motivated grocery shoppers)
- Interview script: auth/signup experience, onboarding, score trust, "scoring in progress" reaction, swap acceptance, willingness to pay
- Conduct interviews with the live app
- Note products with missing ingredients — prioritize in queue
- Compile validation report

#### 8.2 — Prioritized post-MVP backlog (2 pts)

*As a PM, I need a prioritized post-MVP backlog.*

- Document top 5 user-requested features / pain points
- Prioritize: barcode scanning, paywall, profile feedback nudges, advisor review, notifications
- Write user stories for top 3 post-MVP items. Create Linear issues
- **Tool:** Linear MCP server

#### ✅ 8.3 — TESTING: Validation findings to acceptance criteria (1 pt)

- For each user-reported issue, write a failing test case or acceptance criterion
- For score-trust concerns, log specific ingredients for advisor review
- Update test suite with edge cases from interviews

---

## 3. MCP Server & CLI Tool Reference

| Tool | Type | Install | Use | Stories |
|---|---|---|---|---|
| **Convex CLI** | `npx convex` | `npm install convex` | Dev server, schema push, deploy, env vars | 1.1–1.4, 3.2, 7.2 |
| **Convex Dashboard** | Web UI | dashboard.convex.dev | Data inspection, logs, monitoring | 1.4, 2.3, 3.4, 6.4, 7.4 |
| **Anthropic SDK** | npm | `npm install @anthropic-ai/sdk` | Ingredient scoring + alternatives + extraction fallback | 2.1, 3.1–3.2, 7.1–7.2 |
| **Open Food Facts** | REST API | No key needed | Ingredient list extraction (primary source) | 2.1 |
| **Claude Code** | CLI | `npm install -g @anthropic-ai/claude-code` | Agentic coding, prompt iteration | All |
| **Vitest** | npm | `npm install -D vitest` | Unit testing | 1.4, 2.3, 3.4, 4.4, 5.5, 7.4 |
| **Playwright MCP** | MCP Server | `npm install -D playwright` | E2E browser testing | 3.4, 5.5, 6.4 |
| **Linear MCP** | MCP Server | Claude.ai → Connected Tools | Sprint tasks, backlog | 8.2 |
| **Vercel CLI** | `npx vercel` | `npm install -g vercel` | Frontend deploys | 5.1 (deploy) |

---

## 4. Definition of Done

- Code committed to feature branch, reviewed via PR.
- Convex schema pushes cleanly — no errors on `npx convex dev`.
- Auth checks tested: unauthenticated calls to admin/profile functions throw errors.
- Assembly formula unit tests pass for all known edge cases.
- Each epic's test story is complete before starting the next epic.
- Deployed to Vercel preview URL and smoke-tested.

### Testing Strategy

**Unit tests (Vitest):** Assembly formula, extraction normalization, queue deduplication, personalization query. Eight test stories across eight epics.

**E2E tests (Playwright):** Full user journeys — signup, onboarding, instant score, partial score, reactive updates, profile edit, admin ingredient scoring.

**Manual:** Convex Dashboard verification after every epic. Spot-check re-seeded products against v2 scores for sanity.

---

## 5. Post-MVP Backlog

- Scientific advisor review workflow
- Barcode scanning (camera-based UPC → Open Food Facts lookup)
- Paywall and subscription management
- Profile feedback nudges and life-stage prompts
- User notifications on tier change for saved products
- Target API / product catalog integration
- Ingredient alias deduplication review tool for admin
- Regulatory event listener (auto-trigger ingredient refresh on FDA/EFSA actions)

---

*CleanList · Delivery Plan v3.0 · March 2026 · Confidential — for partner review only*
