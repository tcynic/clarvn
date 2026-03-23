:::::::::::::::::: site-header
::::::::::::::::: header-inner
::: header-eyebrow
Architecture Document · March 2026 · Confidential
:::

# CleanList *Architecture Document* {#cleanlist-architecture-document .header-title}

System design for the CleanList MVP Scoring Operations --- Convex
backend, three AI operations, consumer app, and admin UI.

::::::::::::::: header-meta
<div>

::: meta-label
Version
:::

::: meta-value
v2.2
:::

</div>

<div>

::: meta-label
Backend
:::

::: meta-value
Convex (reactive database)
:::

</div>

<div>

::: meta-label
AI Engine
:::

::: meta-value
Claude Sonnet 4.5 / Opus fallback
:::

</div>

<div>

::: meta-label
Tables
:::

::: meta-value
5 (scoring_queue, products, ingredients, condition_modifiers,
product_ingredients)
:::

</div>
:::::::::::::::
:::::::::::::::::
::::::::::::::::::

::::: {#overview .section .section}
:::: container
::: section-eyebrow
Section 01
:::

## System Overview {#system-overview .section-title}

CleanList is a food product scoring application that evaluates grocery
products based on ingredient safety evidence, regulatory consensus, and
avoidance priority. The system produces two scores per product: a
universal **base score** (1--10) and a **personalized score** adjusted
upward by the user\'s health profile.

The MVP architecture consists of two independent systems sharing a
single Convex backend:

**Consumer App ---** A mobile-first React application where users build
a shopping list, receive ingredient-level scores, see personalized risk
modifiers, and discover cleaner alternatives. Personal score calculation
happens client-side. Convex\'s reactive queries keep the UI in live sync
with the database --- when an admin scores a product, any consumer
viewing that product sees the update instantly.

**Admin/Scoring System ---** A protected admin UI plus three AI-powered
operations (Bulk Seed, Add Product, Refresh Check) that generate and
maintain scores. The admin UI is organized around a unified scoring
queue. AI scoring calls run as Convex actions, which can make external
API calls to the Anthropic API while mutations handle the transactional
database writes.

In MVP, AI-generated scores publish directly after JSON schema
validation --- no human review gate. Scientific advisor review is
deferred to post-MVP.
::::
:::::

::::::::::::::: {#arch .section .section}
:::::::::::::: container
::: section-eyebrow
Section 02
:::

## High-Level Architecture {#high-level-architecture .section-title}

The data flow follows a linear pipeline:

:::::::::::: flow-inline
::: flow-node
Queue entry created
:::

::: flow-arrow
→
:::

::: {.flow-node .ai}
Convex action calls Claude API
:::

::: flow-arrow
→
:::

::: {.flow-node .db}
JSON validated
:::

::: flow-arrow
→
:::

::: {.flow-node .db}
Mutation writes to DB
:::

::: flow-arrow
→
:::

::: flow-node
Consumer queries update reactively
:::
::::::::::::

### 2.1 Technology Stack

  Layer                    Technology
  ------------------------ -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Backend & Database**   Convex --- reactive document-relational database with TypeScript server functions (queries, mutations, actions). Schema defined in `convex/schema.ts`. Managed cloud hosting with generous free tier.
  **AI Scoring**           Anthropic API --- `claude-sonnet-4-5` at temperature 0. Fallback to `claude-opus-4-5` on JSON validation failure. Called from Convex actions.
  **Server Functions**     Convex functions: queries (read, reactive), mutations (write, transactional), actions (external API calls). Bulk seed as a Node.js CLI script calling Convex mutations.
  **Consumer App**         React (Next.js or Vite) --- mobile-first SPA. Convex React client with `useQuery`/`useMutation` hooks for live-updating UI.
  **Admin UI**             React with Convex Auth. Protected route. Queue-first layout. Same Convex client library.
  **Hosting**              Convex cloud (backend). Vercel or Netlify (frontend static hosting).
  **Auth**                 Convex Auth or Clerk integration. Consumer: anonymous or email. Admin: email with admin role checked in mutation/query handlers.

### 2.2 Convex Architecture Patterns

Convex uses three function types that map directly to CleanList\'s
needs:

**Queries (read-only, reactive):** Used by the consumer app to fetch
products, ingredients, and condition_modifiers. Convex queries are
reactive --- the consumer app automatically receives updates when new
products are scored. No polling or manual refresh needed.

**Mutations (write, transactional):** Used to insert scored products,
update queue status, upsert ingredients, and handle deduplication logic.
Every mutation is a full transaction --- no partial writes. Mutations
cannot make external API calls.

**Actions (external calls):** Used for AI scoring operations. An action
calls the Anthropic API, validates the JSON response, then calls
internal mutations to write results. Actions are non-deterministic and
cannot directly read/write the DB --- they must delegate to mutations
and queries.

### 2.3 External Dependencies

  Service                Purpose                                                                 MCP / CLI Tooling
  ---------------------- ----------------------------------------------------------------------- --------------------------------------------------------------------------------------------
  **Anthropic API**      AI scoring engine. All three operations call this via Convex actions.   Anthropic SDK (`@anthropic-ai/sdk`). Claude Code CLI for prompt iteration.
  **Convex**             Backend database, server functions, auth, scheduling, dashboard.        Convex CLI (`npx convex dev` / `npx convex deploy`). Convex Dashboard for data inspection.
  **Clerk (optional)**   Auth provider if using Convex + Clerk instead of Convex Auth.           Clerk Dashboard. Webhook integration with Convex.
  **Vercel**             Frontend hosting for consumer app and admin UI.                         Vercel CLI (`npx vercel`) for deploy previews.
  **Linear / GitHub**    Issue tracking and source control.                                      Linear MCP server. GitHub CLI (`gh`).
::::::::::::::
:::::::::::::::

::::::::::::::::::::::::::::::: {#schema .section .section}
:::::::::::::::::::::::::::::: container
::: section-eyebrow
Section 03
:::

## Database Schema {#database-schema .section-title}

Five core tables defined in `convex/schema.ts` using Convex\'s
`defineSchema` and `defineTable` with the `v` validator builder. Convex
automatically adds `_id` and `_creationTime` system fields to every
document.

:::::::::::::::::::::::::::: schema-grid
::::::: {.schema-card .highlight}
::::: schema-card-header
::: schema-table-name
scoring_queue
:::

::: schema-table-desc
Unified queue for all pending scoring work --- new in v2.2
:::
:::::

  Field               Convex Type                      Notes
  ------------------- -------------------------------- ------------------------------------------------------------
  `_id`               Id (auto)                        System-generated document ID
  `productName`       v.string()                       As entered by source. AI normalizes during scoring.
  `source`            v.union(v.literal(\...))         \"user_request\" \| \"admin_add\" \| \"alternative\"
  `priority`          v.number()                       1 = high (user request), 2 = medium (alt), 3 = low (admin)
  `requestCount`      v.number()                       Increments on duplicate requests. Default 1.
  `sourceProductId`   v.optional(v.id(\"products\"))   Only set for alternative source.
  `status`            v.union(v.literal(\...))         \"pending\" \| \"scoring\" \| \"done\" \| \"failed\"
  `scoredAt`          v.optional(v.number())           Timestamp set when scoring completes.
  `productId`         v.optional(v.id(\"products\"))   Set on success. Links to resulting product.
  `errorMessage`      v.optional(v.string())           Populated on failure.

::: {style="padding:.5rem .75rem;font-size:.72rem;color:var(--ink-3)"}
Indexes: `.index("by_status_priority", ["status", "priority"])` ·
`.index("by_productName", ["productName"])`
:::
:::::::

::::::: schema-card
::::: schema-card-header
::: schema-table-name
products
:::

::: schema-table-desc
Core product records --- status simplified to scored \| archived
:::
:::::

  Field                  Convex Type                       Notes
  ---------------------- --------------------------------- ----------------------------------------------------
  `name`                 v.string()                        Full product name.
  `brand`                v.string()                        Brand name.
  `upc`                  v.optional(v.array(v.string()))   Array for multi-UPC products.
  `emoji`                v.optional(v.string())            Display emoji.
  `baseScore`            v.number()                        Universal score 1--10.
  `tier`                 v.union(v.literal(\...))          \"Clean\" \| \"Watch\" \| \"Caution\" \| \"Avoid\"
  `status`               v.union(v.literal(\...))          \"scored\" \| \"archived\"
  `scoreVersion`         v.number()                        Increments on each rescore.
  `scoredAt`             v.number()                        Timestamp of last scoring.
  `refreshConfirmedAt`   v.optional(v.number())            Last successful refresh check.

::: {style="padding:.5rem .75rem;font-size:.72rem;color:var(--ink-3)"}
Indexes: `.index("by_name", ["name"])` ·
`.index("by_status", ["status"])`
:::
:::::::

::::::: schema-card
::::: schema-card-header
::: schema-table-name
ingredients
:::

::: schema-table-desc
Canonical ingredient reference with three dimension scores
:::
:::::

  Field                 Convex Type                Notes
  --------------------- -------------------------- -----------------------------------------------
  `canonicalName`       v.string()                 Unique. Primary lookup key.
  `aliases`             v.array(v.string())        Alternative names.
  `harmEvidenceScore`   v.number()                 1--10. Weighted 40%.
  `regulatoryScore`     v.number()                 1--10. Weighted 35%.
  `avoidanceScore`      v.number()                 1--10. Weighted 25%.
  `baseScore`           v.number()                 Composite: (harm×0.4)+(reg×0.35)+(avoid×0.25)
  `tier`                v.union(v.literal(\...))   Derived from baseScore.
  `flagLabel`           v.optional(v.string())     Consumer-facing label.
  `evidenceSources`     v.optional(v.any())        Structured evidence citations.

::: {style="padding:.5rem .75rem;font-size:.72rem;color:var(--ink-3)"}
Index: `.index("by_canonicalName", ["canonicalName"])`
:::
:::::::

::::::: schema-card
::::: schema-card-header
::: schema-table-name
condition_modifiers
:::

::: schema-table-desc
Links ingredients to health conditions for personalization
:::
:::::

  Field                Convex Type                Notes
  -------------------- -------------------------- ---------------------------------------------------
  `ingredientId`       v.id(\"ingredients\")      FK to ingredients.
  `condition`          v.string()                 ADHD, IBS, pregnancy, etc.
  `modifierAmount`     v.number()                 Always positive.
  `evidenceCitation`   v.string()                 Must cite real study or regulatory finding.
  `evidenceQuality`    v.optional(v.string())     RCT \| cohort \| animal \| regulatory \| advocacy
  `status`             v.union(v.literal(\...))   \"active\" \| \"archived\"

::: {style="padding:.5rem .75rem;font-size:.72rem;color:var(--ink-3)"}
Indexes: `.index("by_ingredientId", ["ingredientId"])` ·
`.index("by_condition", ["condition"])`
:::
:::::::

::::::: schema-card
::::: schema-card-header
::: schema-table-name
product_ingredients
:::

::: schema-table-desc
Many-to-many junction between products and ingredients
:::
:::::

  Field            Convex Type             Notes
  ---------------- ----------------------- -------
  `productId`      v.id(\"products\")      
  `ingredientId`   v.id(\"ingredients\")   

::: {style="padding:.5rem .75rem;font-size:.72rem;color:var(--ink-3)"}
Index: `.index("by_productId", ["productId"])`
:::
:::::::
::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::
:::::::::::::::::::::::::::::::

::::: {#ops .section .section}
:::: container
::: section-eyebrow
Section 04
:::

## AI Operations {#ai-operations .section-title}

Three operations power the scoring system. All share the same core
scoring prompt from the Scoring Algorithm Specification v1.0. In Convex,
each operation is an **action** (for the external Claude API call) that
delegates to **internal mutations** (for transactional DB writes).

### 4.1 Operation 1 --- Bulk Seed (CLI Script)

**Purpose:** One-time batch scoring of the initial \~500 product seed
list across 14 grocery categories.

**Runtime:** Node.js CLI script using `ConvexHttpClient` from
`"convex/browser"` to call Convex mutations. Runs unattended for 35--50
minutes.

**API Config:** `claude-sonnet-4-5`, temperature 0, max_tokens 1500.

**Resumability:** Script queries Convex for existing products before
each call and skips already-scored products. Failed products are written
to scoring_queue for retry via Operation 2.

**Side effect:** Alternatives identified during scoring are added to
scoring_queue with `source="alternative"`.

### 4.2 Operation 2 --- Add Product (Convex Action)

**Purpose:** Score a single product on demand. Triggered by the admin UI
\"Score Now\" button.

**Flow:** Mutation sets queue entry status → action calls Claude API →
validates JSON → mutation writes to products → mutation sets queue entry
to \"done.\" On failure: status \"failed\" with errorMessage. One
automatic retry before marking failed.

**Side effect:** Alternatives auto-queued via mutation with
source=\"alternative\", priority=2.

### 4.3 Operation 3 --- Refresh Check (Convex Action)

**Purpose:** Re-evaluate all published products in diff mode. Run
quarterly or after a major regulatory event.

**Prompt mode:** Diff mode --- model returns `{"change": false}` if
nothing material changed. Otherwise returns changed fields +
change_reason.

**Batch handling:** Uses `ctx.scheduler.runAfter` to process products in
batches to avoid action timeout.
::::
:::::

::::: {#scoring .section .section}
:::: container
::: section-eyebrow
Section 05
:::

## Scoring Algorithm Summary {#scoring-algorithm-summary .section-title}

The base score is a weighted composite of three dimensions, each scored
1--10:

  Dimension                  Weight   What it measures
  -------------------------- -------- ----------------------------------------------------------------------------------------------------------------------------
  **Harm Evidence**          40%      Strength of scientific evidence of harm, weighted by evidence quality (human RCTs \> animal studies \> advocacy).
  **Regulatory Consensus**   35%      Number and tier of jurisdictions restricting the ingredient. Tier 1 (EU/FDA) = 3pts, Tier 2 (UK/Aus) = 2pts, Tier 3 = 1pt.
  **Avoidance Priority**     25%      How prevalent in the food supply and how hard to avoid.

### Output Tiers

  Tier                       Score Range   Meaning
  -------------------------- ------------- -----------------------------------------------------------------
  [Clean]{.tier-clean}       1.0 -- 3.0    No significant concern. Safe to include.
  [Watch]{.tier-watch}       4.0 -- 5.0    Some evidence of concern, especially for sensitive populations.
  [Caution]{.tier-caution}   6.0 -- 7.0    Meaningful concern across multiple sources. Consider swapping.
  [Avoid]{.tier-avoid}       8.0 -- 10.0   Strong evidence of harm and/or banned by major regulators.

### Personalization

**Personal Score = Base Score + Σ(applicable profile modifiers)**,
capped at 10.0. Modifiers may only increase scores. Each modifier must
cite a peer-reviewed study or regulatory finding. Four profile attribute
types: life stage, diagnosed conditions, dietary restrictions, and
self-reported sensitivities.
::::
:::::

::::: {#consumer .section .section}
:::: container
::: section-eyebrow
Section 06
:::

## Consumer App Architecture {#consumer-app-architecture .section-title}

**Onboarding:** Chat-style flow collecting motivation, health
conditions, and sensitivities. Profile stored in localStorage.

**Shopping List:** Users search/add products. Each product triggers a
Convex query. Hit = instant score. Miss = \"Not yet scored\" with a
\"Request\" button that calls a mutation to write to scoring_queue.

**Reactive Updates:** When an admin scores a requested product, the
consumer\'s \"Not yet scored\" state automatically updates --- no
polling needed. This is a key UX advantage of Convex.

**Product Detail:** Base score, personal score with modifier breakdown,
ingredient-level scores, cleaner alternatives with \"Swap.\"

**Score Calculation:** Personal score is calculated **client-side**:
baseScore (from Convex) + sum of applicable condition_modifiers (from
Convex, filtered by profile). Health data never leaves the device.

**Latency Target:** \< 400ms for DB-hit products.
::::
:::::

::::: {#admin .section .section}
:::: container
::: section-eyebrow
Section 07
:::

## Admin UI Architecture {#admin-ui-architecture .section-title}

Queue-first layout using the same Convex React client. Auth check at the
top of every query/mutation handler.

**Scoring Queue View (P0):** Reactive query lists all pending/failed
entries sorted by priority then requestCount. \"Score Now\" invokes the
scoring action. Failed entries show error + \"Retry.\"

**Add to Queue (P0):** Text input calls mutation with deduplication.
source=\"admin_add\", priority=3.

**Product Browser (P0):** Searchable list via Convex search index. Click
shows full record with ingredients and modifiers.

**Score Next N (P1):** Batch processing for the top N queue entries.

**Refresh Trigger (P0):** Button to invoke Operation 3 against all
products or a filtered subset.
::::
:::::

::::: {#security .section .section}
:::: container
::: section-eyebrow
Section 08
:::

## Security & Access Control {#security-access-control .section-title}

Convex does not use Row-Level Security. Authorization is enforced in
code at the top of every public function:

- Every public query and mutation checks `ctx.auth.getUserIdentity()`
  and verifies the user\'s role. Admin functions throw `ConvexError` if
  not authorized.
- Internal functions (`internalMutation`, `internalQuery`,
  `internalAction`) handle sensitive operations. Not exposed to the
  public API.
- Consumer app uses public queries (read-only) and a single public
  mutation for miss requests. No other write access.
- Health profile data stays in localStorage. No user health data is
  stored in Convex.
- Anthropic API key stored as Convex environment variable
  (`npx convex env set`). Never exposed to client.
- MVP disclosure: all scores labeled \"AI-generated --- independent
  expert review coming soon.\"
::::
:::::

::::: {#decisions .section .section}
:::: container
::: section-eyebrow
Section 09
:::

## Key Architectural Decisions {#key-architectural-decisions .section-title}

  Decision                           Rationale
  ---------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Convex over Supabase**           Reactive queries eliminate polling. TypeScript-native schema and server functions. Actions for external API calls are a natural fit for the Claude scoring pipeline. Simpler auth model (code-level checks vs. RLS).
  **Client-side personal scoring**   Health data never leaves the device. Eliminates HIPAA-adjacent risk. Server is a flat data read.
  **No advisor gate in MVP**         Reduces launch timeline from months to weeks. AI scores strong enough for early validation.
  **Single scoring queue**           Merges three input channels into one work surface. Accurate demand signals via requestCount.
  **Sonnet-first, Opus fallback**    Sonnet is 10× cheaper. Opus reserved for JSON validation failures only.
  **Action → Mutation pattern**      Actions handle external API calls (Claude), then delegate writes to mutations which are fully transactional. No partial writes.
::::
:::::

::::: {#tooling .section .section}
:::: container
::: section-eyebrow
Section 10
:::

## Recommended MCP Servers & CLI Tools {#recommended-mcp-servers-cli-tools .section-title}

  Tool                   Type                      Use Case
  ---------------------- ------------------------- ------------------------------------------------------------------------------
  **Convex CLI**         [npx convex]{.tool-tag}   Local dev server, schema push, deploy functions, manage env vars, dashboard.
  **Convex Dashboard**   Web UI                    Inspect data, view logs, debug functions, monitor usage.
  **Anthropic SDK**      [npm]{.tool-tag}          Claude API calls from Convex actions and bulk seed script.
  **Claude Code**        [CLI]{.tool-tag}          Agentic coding, feature building, prompt iteration.
  **Linear MCP**         MCP Server                Sprint tasks, issue tracking, PR linking from within Claude.
  **GitHub CLI**         [gh]{.tool-tag}           Branch management, PRs, code review, Actions workflows.
  **Vercel CLI**         [npx vercel]{.tool-tag}   Frontend deploy previews and production deploys.
  **Playwright MCP**     MCP Server                Automated E2E testing of consumer and admin flows.
  **Vitest**             [npm]{.tool-tag}          Unit testing for Convex functions, scoring logic, validators.
::::
:::::

::::: {#risks .section .section}
:::: container
::: section-eyebrow
Section 11
:::

## Risks & Mitigations {#risks-mitigations .section-title}

  Risk                               Impact                                                               Mitigation
  ---------------------------------- -------------------------------------------------------------------- ------------------------------------------------------------------------------
  **AI scoring accuracy**            Wrong score --- over-flags safe or under-flags harmful ingredient.   In-app disclosure. Monitor feedback. Advisor workflow post-MVP.
  **Queue growth outpacing admin**   500--1000 alternatives pile up after bulk seed.                      Build \"Score Next N\" batch processing as P1.
  **Bulk seed failures**             API failures or invalid JSON mid-run.                                Script is resumable. Failed → scoring_queue for retry.
  **Convex action timeout**          Long-running scoring actions may hit timeout.                        Batch in CLI script. Single-product actions stay under limit. Use scheduler.
  **Regulatory lag**                 Time between regulatory event and DB update.                         Admin subscribes to feeds. Operation 3 refresh.
::::
:::::

CleanList · Architecture Document · March 2026 · Confidential --- for
partner review only
