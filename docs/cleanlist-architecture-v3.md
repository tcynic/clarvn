# CleanList — Architecture Document v3.0

> **Architecture Document · v3.0 · March 2026 · Confidential — for partner review only**

| | |
|---|---|
| **Key change** | Ingredient-first pipeline (v2 was product-first) |
| **Backend** | Convex (reactive database) |
| **AI Engine** | Claude Sonnet 4.5 / Opus fallback |
| **Auth** | Required — email or social login |

---

> **v3.0 Core Principle:** Ingredients are the atomic unit of scoring, not products. Each ingredient is scored once, ever. Product scores are assembled deterministically from their ingredient scores using a weighted-worst formula — no AI needed. This eliminates redundant scoring, ensures consistency, and means products with all-known ingredients get instant scores with no queue and no admin involvement.

---

## 1. System Overview

CleanList is a food product scoring application that evaluates grocery products based on ingredient safety. The system scores **ingredients** individually, then assembles **product scores** deterministically from those ingredients. Every user gets two numbers per product: a universal base score and a personalized score adjusted by their health profile.

The v3 architecture introduces three fundamental changes from v2:

> **1. Ingredient-first scoring.** The AI scores each unique ingredient once on three dimensions (harm evidence, regulatory consensus, avoidance priority). Product scores are pure math. Red No. 40 is scored once — not re-evaluated in every product that contains it.

> **2. Instant product assembly.** When a user requests a product and all its ingredients are already scored, the product score is computed in milliseconds — no queue, no AI, no admin. Only genuinely new ingredients enter the scoring queue.

> **3. Server-side personalization with user accounts.** Users authenticate via email or social login. Health profiles are stored in Convex (source of truth) with localStorage as a speed cache. Personal scores are computed server-side by joining the user's profile conditions against ingredient-level condition modifiers.

---

## 2. The Scoring Pipeline

When a user adds a product to their shopping list, the system executes the following pipeline. Most products will complete in milliseconds once the ingredient database is populated.

### Step 1 — Ingredient Extraction `HYBRID`

Fetch the product's ingredient list. Try **Open Food Facts API** first (free, no AI cost). If not found, fall back to a lightweight AI call: "List the ingredients in [product name, brand]." Store the product → ingredient mapping in `product_ingredients`.

### Step 2 — Ingredient Lookup `NO AI`

Check each ingredient against the `ingredients` table. Split into two buckets: **scored** (already in DB) and **unscored** (new to the system). This is a simple database query — no AI involved.

### Step 3 — Ingredient Scoring `AI CALL` `QUEUED`

Each unscored ingredient is added to the **ingredient queue**. Admin processes the queue — each ingredient gets a full three-dimension scoring call (harm evidence, regulatory consensus, avoidance priority) plus condition modifiers and evidence citations. **One AI call per unique ingredient, ever.** Scoring one ingredient may unblock multiple pending products.

### Step 4 — Product Assembly `NO AI — PURE MATH`

Once all ingredients are scored, compute the product base score using the **weighted-worst formula** (see §5). This is deterministic, instant, and requires no admin involvement. If some ingredients are still pending, compute a partial score from known ingredients and show "Scoring in progress."

### Step 5 — Personalization `NO AI — SERVER QUERY`

A Convex query joins the user's health profile conditions against ingredient-level condition modifiers. Personal Score = Product Base Score + applicable modifiers, capped at 10.0. Computed server-side. Returned to the client via reactive query.

### Step 6 — Alternatives `AI CALL` `QUEUED`

A separate lightweight AI call queued after assembly: "Given [product] in [category] with tier [X], suggest 2–3 cleaner alternatives." Decoupled from the scoring pipeline — the product score is live before alternatives arrive.

> **The key insight:** Steps 2, 4, and 5 require zero AI. Once the ingredient database is populated from the initial seed, most new products will only need Step 1 (extraction) and then hit instant assembly. The queue only grows when genuinely new ingredients enter the system.

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| **Backend & Database** | Convex — reactive document-relational database with TypeScript server functions. Schema in `convex/schema.ts`. |
| **AI Scoring** | Anthropic API — `claude-sonnet-4-5` at temperature 0. Fallback to `claude-opus-4-5` on JSON validation failure. Called from Convex actions for ingredient scoring and alternatives only. |
| **Ingredient Data** | Open Food Facts API (primary). AI extraction fallback via Convex action. Barcode/UPC lookup post-MVP. |
| **Auth** | Convex Auth or Clerk — email + social login required. User profiles stored in Convex. |
| **Consumer App** | React (Next.js or Vite) — mobile-first SPA. Convex React client with `useQuery`/`useMutation`. |
| **Admin UI** | React with Convex Auth. Ingredient-queue-first layout. |
| **Hosting** | Convex cloud (backend). Vercel (frontend). |

### Convex Function Patterns

**Queries (reactive, read-only):** Product lookup, ingredient lookup, personalized score calculation, ingredient queue listing. All reactive — consumer app auto-updates when data changes.

**Mutations (transactional, write):** Store ingredient lists, write scored ingredients, assemble product scores, update queue status, manage user profiles. Every mutation is a full transaction.

**Actions (external calls):** Open Food Facts API fetch, Claude API calls for ingredient scoring and alternatives. Actions delegate all DB writes to internal mutations.

---

## 4. Database Schema

Seven tables in `convex/schema.ts`. The `ingredient_queue` and `user_profiles` tables are new. The `products` table gains assembly fields. The `ingredients` table is now the primary scored entity.

### ingredient_queue `NEW`

*Replaces the product-level scoring_queue as the admin's primary work surface*

| Field | Convex Type | Notes |
|---|---|---|
| `_id` | Id (auto) | System-generated. |
| `canonicalName` | v.string() | Ingredient name to be scored. |
| `status` | v.union(v.literal(...)) | "pending" \| "scoring" \| "done" \| "failed" |
| `priority` | v.number() | 1 = blocks a user-requested product. 2 = from bulk seed. 3 = admin proactive. |
| `requestCount` | v.number() | How many pending products need this ingredient. Higher = more urgent. |
| `blockedProductIds` | v.array(v.id("products")) | Products waiting on this ingredient. When scored, these attempt auto-assembly. |
| `ingredientId` | v.optional(v.id("ingredients")) | Set on success. Links to resulting ingredient record. |
| `errorMessage` | v.optional(v.string()) | Populated on failure. |

Indexes: `.index("by_status_priority", ["status", "priority"])` · `.index("by_canonicalName", ["canonicalName"])`

### user_profiles `NEW`

*Health profile for personalization — source of truth (localStorage is cache)*

| Field | Convex Type | Notes |
|---|---|---|
| `_id` | Id (auto) | |
| `userId` | v.string() | Auth identity. Indexed. One profile per user. |
| `motivation` | v.optional(v.string()) | From onboarding: "General health", "Kids", etc. |
| `conditions` | v.array(v.string()) | ADHD, IBS, pregnancy, thyroid, eczema, etc. |
| `sensitivities` | v.array(v.string()) | Migraines, gut sensitivity, food allergies, etc. |

Index: `.index("by_userId", ["userId"])`

### ingredients `NOW PRIMARY`

*The core scored entity — each ingredient scored once, used by all products*

| Field | Convex Type | Notes |
|---|---|---|
| `canonicalName` | v.string() | Unique. Primary lookup key. |
| `aliases` | v.array(v.string()) | Alternative names for matching. |
| `harmEvidenceScore` | v.number() | 1–10. Weighted 40%. |
| `regulatoryScore` | v.number() | 1–10. Weighted 35%. |
| `avoidanceScore` | v.number() | 1–10. Weighted 25%. |
| `baseScore` | v.number() | (harm×0.4)+(reg×0.35)+(avoid×0.25) |
| `tier` | v.union(v.literal(...)) | Clean \| Watch \| Caution \| Avoid |
| `flagLabel` | v.optional(v.string()) | Consumer-facing label: "Hyperactivity link" |
| `evidenceSources` | v.optional(v.any()) | Structured evidence citations (JSON). |
| `scoreVersion` | v.number() | Increments on rescore. |
| `scoredAt` | v.number() | Timestamp. |

Index: `.index("by_canonicalName", ["canonicalName"])`

### products `CHANGED`

*Product records — score now assembled from ingredients, not from AI directly*

| Field | Convex Type | Notes |
|---|---|---|
| `name` | v.string() | Full product name. |
| `brand` | v.string() | |
| `upc` | v.optional(v.array(v.string())) | |
| `emoji` | v.optional(v.string()) | |
| `baseScore` | v.optional(v.number()) | Assembled score. Null if pending ingredients. |
| `tier` | v.optional(v.union(v.literal(...))) | Derived from baseScore. Null if pending. |
| `assemblyStatus` | v.union(v.literal(...)) | **"complete" \| "partial" \| "pending_ingredients"** |
| `pendingIngredientCount` | v.number() | 0 when fully assembled. Decrements as ingredients are scored. |
| `worstIngredientId` | v.optional(v.id("ingredients")) | The ingredient driving the score. |
| `ingredientSource` | v.union(v.literal(...)) | "open_food_facts" \| "ai_extraction" \| "manual" |

Indexes: `.index("by_name", ["name"])` · `.index("by_assemblyStatus", ["assemblyStatus"])`

### condition_modifiers `UNCHANGED`

| Field | Convex Type | Notes |
|---|---|---|
| `ingredientId` | v.id("ingredients") | FK to ingredients. |
| `condition` | v.string() | ADHD, IBS, pregnancy, etc. |
| `modifierAmount` | v.number() | Always positive. |
| `evidenceCitation` | v.string() | Must cite real study. |
| `evidenceQuality` | v.optional(v.string()) | RCT \| cohort \| animal \| regulatory \| advocacy |
| `status` | v.union(v.literal(...)) | "active" \| "archived" |

Indexes: `.index("by_ingredientId", ["ingredientId"])` · `.index("by_condition", ["condition"])`

### product_ingredients `UNCHANGED`

| Field | Convex Type |
|---|---|
| `productId` | v.id("products") |
| `ingredientId` | v.id("ingredients") |

Index: `.index("by_productId", ["productId"])`

### alternatives_queue `NEW`

| Field | Convex Type | Notes |
|---|---|---|
| `productId` | v.id("products") | Product needing alternatives. |
| `status` | v.union(v.literal(...)) | "pending" \| "done" \| "failed" |
| `alternatives` | v.optional(v.array(v.object({...}))) | Populated on success: name, brand, reason. |

---

## 5. Scoring Formulas

### 5.1 Ingredient Base Score (AI-generated, one-time)

Each ingredient is scored on three dimensions, each 1–10:

| Dimension | Weight | What it measures |
|---|---|---|
| **Harm Evidence** | 40% | Strength of scientific evidence of harm (human RCTs > animal studies > advocacy). |
| **Regulatory Consensus** | 35% | Jurisdictions restricting it. Tier 1 (EU/FDA) = 3pts, Tier 2 (UK/Aus) = 2pts, Tier 3 = 1pt. |
| **Avoidance Priority** | 25% | Prevalence in food supply and difficulty of avoidance. |

```
Ingredient Base Score = (Harm Evidence × 0.40) + (Regulatory Consensus × 0.35) + (Avoidance Priority × 0.25)
```

### 5.2 Product Base Score (deterministic assembly, no AI)

The worst ingredient sets the floor. Additional flagged ingredients (score ≥ 4.0) add a scaled penalty.

```
Product Base Score = max(all ingredient scores)
                   + Σ( 0.1 + (ingredientScore - 4.0) × 0.1 )
                     for each ADDITIONAL ingredient where score ≥ 4.0

Capped at 10.0
```

#### Penalty scaling examples

| Additional ingredient score | Penalty calculation | Penalty added |
|---|---|---|
| 4.0 (barely flagged) | 0.1 + (4.0 - 4.0) × 0.1 | **+0.10** |
| 5.0 (mid-Watch) | 0.1 + (5.0 - 4.0) × 0.1 | **+0.20** |
| 6.5 (Caution) | 0.1 + (6.5 - 4.0) × 0.1 | **+0.35** |
| 8.0 (Avoid) | 0.1 + (8.0 - 4.0) × 0.1 | **+0.50** |

#### Worked example — Froot Loops

Ingredients: Red No. 40 = 6.3, BHT = 5.8, Yellow No. 6 = 5.5, Sugar = 2.1, Flour = 1.0

```
Floor (worst):   6.3  (Red No. 40)
BHT penalty:     0.1 + (5.8 - 4.0) × 0.1 = +0.28
Yellow #6:       0.1 + (5.5 - 4.0) × 0.1 = +0.25
Sugar:           below 4.0 → no penalty
Flour:           below 4.0 → no penalty

Product Base Score = 6.3 + 0.28 + 0.25 = 6.83 → 6.8 (Caution)
```

### 5.3 Output Tiers

| Tier | Score Range | Meaning |
|---|---|---|
| **Clean** | 1.0 – 3.0 | No significant concern. |
| **Watch** | 4.0 – 5.0 | Some evidence of concern, especially for sensitive populations. |
| **Caution** | 6.0 – 7.0 | Meaningful concern. Consider swapping. |
| **Avoid** | 8.0 – 10.0 | Strong evidence of harm and/or banned by major regulators. |

### 5.4 Personalization (server-side)

```
Personal Score = Product Base Score + Σ(applicable condition modifiers)
Capped at 10.0
```

Modifiers live on ingredient records, can only increase scores, and must cite evidence. The Convex query joins `user_profiles.conditions` against `condition_modifiers.condition` for all ingredients in the product. Returned to the client alongside the base score.

---

## 6. Consumer App Architecture

**Auth required:** Email or social login before onboarding. Convex Auth or Clerk.

**Onboarding:** Chat-style flow collecting motivation, conditions, sensitivities. Writes profile to Convex (`user_profiles` table) and caches in localStorage.

**Product lookup flow:** User adds a product → system extracts ingredients → looks up all ingredients → if all scored, assembles instantly (the user sees a score in milliseconds). If some unscored, shows "Scoring in progress" with a partial score and the pending ingredient count.

**Reactive updates:** When an admin scores a pending ingredient, every product blocked on that ingredient automatically re-assembles. The consumer's "Scoring in progress" state updates reactively — no refresh needed.

**Product detail:** Base score, personal score with modifier breakdown, ingredient-level scores sorted worst-first, and alternatives (when available).

**Latency:** < 100ms for products with all ingredients scored (pure math). < 2s for products needing Open Food Facts extraction.

---

## 7. Admin UI Architecture

The admin's primary work surface is now the **ingredient queue**, not a product queue. The admin scores ingredients, and products auto-assemble downstream.

**Ingredient Queue View (P0):** Lists all pending/failed ingredients sorted by priority then requestCount. Each row shows: ingredient name, requestCount (how many products are blocked), priority, status. "Score Now" triggers the AI scoring action. "Score Next N" for batch processing.

**Ingredient Browser (P0):** Searchable list of all scored ingredients with their three dimension scores, base score, tier, and evidence citations.

**Product Browser (P0):** Shows products with their assembly status (complete / partial / pending). Click shows ingredient breakdown and which ingredients are pending.

**Alternatives Queue (P1):** Separate view for pending alternative suggestions. Lower priority than ingredient scoring.

---

## 8. Security & Access Control

- **Consumer auth required.** Email or social login via Convex Auth / Clerk. Profile stored in `user_profiles` with `userId` from auth identity.
- **Admin auth.** Every admin mutation/action checks `requireAdmin(ctx)` which verifies admin role on the identity. Uses `internalMutation`/`internalAction` for sensitive operations.
- **Health data in Convex.** User profiles are stored server-side (required for server-side personalization). Privacy policy must disclose this. Data encrypted at rest by Convex.
- **Anthropic API key** stored as Convex environment variable. Never exposed to client.
- **MVP disclosure:** "Scores are AI-generated — independent expert review coming soon."

---

## 9. Key Architectural Decisions

| Decision | Rationale |
|---|---|
| **Ingredient-first over product-first** | Eliminates redundant scoring (Red No. 40 scored once, not 50×). Ensures consistency. Makes scores deterministic and auditable. Gets cheaper over time as the ingredient DB fills. |
| **Deterministic product assembly** | Weighted-worst formula is transparent, reproducible, and requires no AI. Enables instant scoring for products with known ingredients. |
| **Ingredient queue over product queue** | Admin scores ingredients, not products. One scored ingredient unblocks multiple products. More efficient use of admin time and AI spend. |
| **Open Food Facts first, AI fallback** | Eliminates AI cost for ingredient extraction on most mainstream products. OFF has 3M+ products. AI fallback covers gaps. |
| **Server-side personalization** | Profile is in Convex anyway (required for persistence). Server-side join is simpler than client-side — one query returns both scores. |
| **Separate alternatives pipeline** | Decouples the critical path (score assembly) from a nice-to-have (alternatives). Product scores go live before alternatives arrive. |
| **User accounts required** | Enables profile persistence across devices, server-side personalization, and future features (notifications, saved lists, history). |
| **Action → Mutation pattern** | Actions handle external API calls (Claude, OFF), then delegate writes to mutations which are fully transactional. No partial writes. |

---

## 10. MCP Servers & CLI Tools

| Tool | Type | Use Case |
|---|---|---|
| **Convex CLI** | `npx convex` | Dev server, schema push, deploy, env vars. |
| **Convex Dashboard** | Web UI | Data inspection, function logs, monitoring. |
| **Anthropic SDK** | npm | Claude API calls from Convex actions (ingredient scoring + alternatives). |
| **Claude Code** | CLI | Agentic coding, prompt iteration. |
| **Open Food Facts SDK** | npm / REST | Product ingredient extraction. Free API, no key needed. |
| **Linear MCP** | MCP Server | Sprint tasks, issue tracking. |
| **GitHub CLI** | `gh` | Branches, PRs, code review. |
| **Vercel CLI** | `npx vercel` | Frontend deploy previews. |
| **Vitest** | npm | Unit testing for assembly formula, mutations, queries. |
| **Playwright MCP** | MCP Server | E2E testing of consumer and admin flows. |

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Assembly formula produces unintuitive scores** | A product with many mild Watch ingredients might score higher than one with one severe Avoid ingredient. | Formula is tunable — adjust the 0.1 multiplier. Test against known products during seed. Manual spot-checks. |
| **Open Food Facts coverage gaps** | Some niche or new products won't be in OFF. | AI fallback for ingredient extraction. Admin can manually enter ingredient lists. |
| **Ingredient name normalization** | "Red No. 40" vs "FD&C Red 40" vs "Allura Red" — same ingredient, different names. | Canonical name + aliases array on ingredients table. Fuzzy matching during lookup. Dedup review in admin UI. |
| **Partial scores misleading users** | A partial score based on 8/12 scored ingredients might miss the worst one. | Clear "Scoring in progress — X of Y ingredients pending" label. Partial scores shown with visual distinction. |
| **Auth friction reduces signups** | Requiring login before onboarding adds a barrier. | Offer social login (Google, Apple) for one-tap signup. Show value prop before auth gate. |

---

*CleanList · Architecture Document v3.0 · March 2026 · Confidential — for partner review only*
