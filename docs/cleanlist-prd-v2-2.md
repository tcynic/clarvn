:::::::::::::::::: site-header
::::::::::::::::: header-inner
::: header-eyebrow
Product Requirements Document · v2.2 · March 2026 · Confidential
:::

# CleanList *MVP Scoring Operations* {#cleanlist-mvp-scoring-operations .header-title}

Revises v2.1 to remove the scientific advisor review gate from MVP
scope, introduce a unified scoring queue fed by three sources, and
expand the initial product seed list to \~500 products.

::::::::::::::: header-meta
<div>

::: meta-label
Supersedes
:::

::: meta-value
PRD v2.1 --- March 2026
:::

</div>

<div>

::: meta-label
Key changes
:::

::: meta-value
Advisor review deferred · Scoring queue added · 500-product seed
:::

</div>

<div>

::: meta-label
AI operations
:::

::: meta-value
3 (unchanged) --- Bulk Seed · Add Product · Refresh Check
:::

</div>

<div>

::: meta-label
Consumer app
:::

::: meta-value
Unchanged from v2.0
:::

</div>
:::::::::::::::
:::::::::::::::::
::::::::::::::::::

:::::: arch-banner
::::: arch-banner-inner
::: arch-banner-label
v2.2 Core Principle
:::

::: arch-banner-text
**AI scores go live immediately in MVP.** Scientific advisor review is
the right long-term control --- but it is a post-MVP build. In MVP,
AI-generated scores are published directly after a basic validation
pass. A unified scoring queue tracks all pending work from three
sources: user requests, admin additions, and alternatives needing their
own score run.
:::
:::::
::::::

:::: deferred-banner
::: deferred-banner-inner
⚠️ **Post-MVP --- Scientific Advisor Review:** All references to an
advisor review gate have been removed from this document. The review
workflow should be designed and built after MVP launch when score volume
and user trust data justify the investment. When introduced, it will
require: an advisor-facing review UI, a status field distinguishing
AI-generated from advisor-reviewed scores, and a user-visible indicator
on reviewed products.
:::
::::

:::::::::::::::::::::::: {.section .section}
::::::::::::::::::::::: container
::: section-eyebrow
Document Map
:::

## What changed in v2.2 {#what-changed-in-v2.2 .section-title}

::::: toc
::: toc-title
Table of Contents
:::

::: toc-items
[[§1]{.toc-num} Architecture Overview](#arch){.toc-item .changed}
[[§2]{.toc-num} The Scoring Queue](#queue){.toc-item .new}
[[§3]{.toc-num} The Three AI Operations](#ops){.toc-item}
[[§4]{.toc-num} Operation 1 --- Bulk Seed](#op1){.toc-item .changed}
[[§5]{.toc-num} Operation 2 --- Add Product](#op2){.toc-item .changed}
[[§6]{.toc-num} Operation 3 --- Refresh Check](#op3){.toc-item}
[[§7]{.toc-num} Database Schema](#schema){.toc-item .changed}
[[§8]{.toc-num} Consumer App](#consumer){.toc-item} [[§9]{.toc-num}
Admin UI](#admin){.toc-item .changed} [[§10]{.toc-num} Feature
Set](#features){.toc-item .changed} [[§11]{.toc-num} Technical
Requirements](#tech){.toc-item} [[§12]{.toc-num} 500-Product Seed
List](#seed){.toc-item .changed} [[§13]{.toc-num}
Risks](#risks){.toc-item .changed} [[§14]{.toc-num} Next
Steps](#next){.toc-item .changed}
:::
:::::

::: {.section-eyebrow style="margin-bottom:.75rem"}
Changes from v2.1
:::

::::::::::::::::: changelog
:::: change-item
[Removed]{.change-tag .tag-removed}

::: change-text
Scientific advisor review gate removed from all operations. AI output
now goes directly from validation to the `published` status. Post-MVP
note added to header of every affected section.
:::
::::

:::: change-item
[New --- §2]{.change-tag .tag-new}

::: change-text
Unified scoring queue introduced. A single `scoring_queue` table
aggregates all pending work regardless of source. Three entry sources
defined: user miss request, admin manual add, and auto-queued
alternative products.
:::
::::

:::: change-item
[New --- §7]{.change-tag .tag-new}

::: change-text
`scoring_queue` table added to the database schema. `products.status`
enum updated: removed `pending` (advisor gate), simplified to
`queued | scored | archived`.
:::
::::

:::: change-item
[Updated --- §4]{.change-tag .tag-updated}

::: change-text
Bulk seed operation: output now publishes directly after JSON
validation. Advisor review step removed. Error handling for invalid
responses clarified.
:::
::::

:::: change-item
[Updated --- §5]{.change-tag .tag-updated}

::: change-text
Add Product operation: now explicitly handles the alternative auto-queue
case. When a scored product has alternatives, each unseen alternative is
automatically added to the scoring queue.
:::
::::

:::: change-item
[Updated --- §9]{.change-tag .tag-updated}

::: change-text
Admin UI: pending review queue replaced with unified scoring queue view.
Queue shows source, priority, and requester. One-click \"Score Now\"
runs Operation 2 inline.
:::
::::

:::: change-item
[Updated --- §12]{.change-tag .tag-updated}

::: change-text
Seed list expanded from 51 products across 6 categories to \~500
products across 14 categories. Covers the full mainstream US grocery
store footprint.
:::
::::
:::::::::::::::::
:::::::::::::::::::::::
::::::::::::::::::::::::

:::::::::::::::::::: {#arch .section .section}
::::::::::::::::::: container
::: section-eyebrow
Section 01 · Revised
:::

## Architecture overview {#architecture-overview .section-title}

The two-system architecture from v2.0 is unchanged. The only
modification is the removal of the advisor review gate between AI output
and the published database. In MVP, the flow from AI call to live score
is: generate → validate JSON → write to database. The scoring queue is
the new operational hub that surfaces all pending scoring work in one
place.

::::::::::::: flow-inline
::: flow-node
Scoring queue entry created
:::

::: flow-arrow
→
:::

::: {.flow-node .ai}
AI scores the product
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
Written to products DB
:::

::: flow-arrow
→
:::

::: {.flow-node .user}
Consumer app serves score
:::

::: flow-label
v2.1 had a human review step between \"JSON validated\" and \"Written to
products DB\" --- that step is removed in v2.2 MVP.
:::
:::::::::::::

::::: post-mvp-note
::: post-mvp-icon
⚠️
:::

::: post-mvp-text
**Post-MVP: Scientific Advisor Review.** When introduced, the review
gate sits between \"JSON validated\" and \"Written to products DB.\" The
`products.status` field will gain a `pending_review` state. The consumer
app will distinguish reviewed vs. AI-only scores with a visible label.
Until then, all AI-generated scores are published as-is and should be
understood as AI-generated estimates, not independently verified scores.
Consider adding a small disclosure to the consumer app during the MVP
period: \"Scores are AI-generated --- independent expert review coming
soon.\"
:::
:::::

::: {.callout .callout-green}
**What this means in practice.** A user adds a product → it hits the
scoring queue → the admin triggers a score run → the AI scores it → it
publishes immediately. The end-to-end time from queue entry to live
score is minutes, not days. Post-MVP, that same flow gains a human
checkpoint before the last step.
:::
:::::::::::::::::::
::::::::::::::::::::

::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: {#queue .section .section}
:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: container
::: section-eyebrow
Section 02 · New
:::

## The scoring queue {#the-scoring-queue .section-title}

The scoring queue is a single table that consolidates all products
waiting to be scored, regardless of how they got there. Every unseen
product in the system --- whether a user requested it, an admin added
it, or it surfaced as an alternative during a previous score run ---
lands in the same queue. The admin processes the queue from one view in
the admin UI.

:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: queue-diagram
:::::::::::::::::: queue-sources
::::::: queue-source
::: qs-icon
👤
:::

::: qs-title
User miss request
:::

::: qs-desc
A consumer app user adds a product that isn\'t in the database and taps
\"Request this product.\"
:::

::: {.qs-badge .qs-user}
User-initiated
:::
:::::::

::::::: queue-source
::: qs-icon
🛠️
:::

::: qs-title
Admin manual add
:::

::: qs-desc
An admin types a product name into the admin UI and adds it to the queue
proactively, ahead of user demand.
:::

::: {.qs-badge .qs-admin}
Admin-initiated
:::
:::::::

::::::: queue-source
::: qs-icon
🔄
:::

::: qs-title
Alternative auto-queue
:::

::: qs-desc
When a product is scored and its alternatives are identified, each
alternative not yet in the database is automatically added to the queue.
:::

::: {.qs-badge .qs-auto}
System-initiated
:::
:::::::
::::::::::::::::::

:::::::::::: queue-arrow-row
::::: qa-line
::: qa-dash
:::

::: qa-tip
:::
:::::

::::: qa-line
::: qa-dash
:::

::: qa-tip
:::
:::::

::::: qa-line
::: qa-dash
:::

::: qa-tip
:::
:::::
::::::::::::

::::::::::::::::::::::::::::::::::::::::::::::::::::::::: queue-table
::::::: queue-table-header
::: queue-table-icon
📋
:::

<div>

::: queue-table-title
scoring_queue table
:::

::: queue-table-sub
All three sources land here · Admin works from one view · Operation 2
processes each entry
:::

</div>
:::::::

::::::::::::::::::::::::::::::::::::::::::::::::::: queue-fields
::: qf-header
Field
:::

::: qf-header
Type
:::

::: qf-header
Example
:::

::: qf-header
Notes
:::

::: {.qf-col .mono}
queue_id
:::

::: {.qf-col .mono}
uuid PK
:::

::: qf-col
---
:::

::: qf-col
Auto-generated
:::

::: {.qf-col .mono}
product_name
:::

::: {.qf-col .mono}
text
:::

::: qf-col
Froot Loops
:::

::: qf-col
As entered by source. AI normalises during scoring.
:::

::: {.qf-col .mono}
source
:::

::: {.qf-col .mono}
enum
:::

::: qf-col
user_request
:::

::: qf-col
`user_request` \| `admin_add` \| `alternative`
:::

::: {.qf-col .mono}
priority
:::

::: {.qf-col .mono}
integer
:::

::: qf-col
1
:::

::: qf-col
1 = high (user request), 2 = medium (alternative), 3 = low (admin
proactive). Admin can override.
:::

::: {.qf-col .mono}
request_count
:::

::: {.qf-col .mono}
integer
:::

::: qf-col
7
:::

::: qf-col
Number of users who requested this product. Increments on duplicate
requests. Used to surface most-wanted items.
:::

::: {.qf-col .mono}
source_product_id
:::

::: {.qf-col .mono}
uuid FK
:::

::: qf-col
---
:::

::: qf-col
Only set for `alternative` source. Links back to the product whose score
run identified this alternative.
:::

::: {.qf-col .mono}
status
:::

::: {.qf-col .mono}
enum
:::

::: qf-col
pending
:::

::: qf-col
`pending` \| `scoring` \| `done` \| `failed`
:::

::: {.qf-col .mono}
created_at
:::

::: {.qf-col .mono}
timestamptz
:::

::: qf-col
---
:::

::: qf-col
When the entry was added to the queue
:::

::: {.qf-col .mono}
scored_at
:::

::: {.qf-col .mono}
timestamptz
:::

::: qf-col
---
:::

::: qf-col
Set when Operation 2 completes for this entry
:::

::: {.qf-col .mono}
product_id
:::

::: {.qf-col .mono}
uuid FK
:::

::: qf-col
---
:::

::: qf-col
Set on success --- links to the resulting record in the products table
:::

::: {.qf-col .mono}
error_message
:::

::: {.qf-col .mono}
text
:::

::: qf-col
---
:::

::: qf-col
Populated if status = `failed`. Shows JSON validation error or API error
for admin review.
:::
:::::::::::::::::::::::::::::::::::::::::::::::::::
:::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

::: {.section-eyebrow style="margin-bottom:.875rem"}
Deduplication rule
:::

Before adding any entry to the queue, the system checks: (1) is this
product already in the published database (by name fuzzy match or UPC)?
If yes, do not add --- return the existing score. (2) Is there already a
`pending` or `scoring` entry for this product name in the queue? If yes,
increment `request_count` on the existing entry rather than creating a
duplicate. This keeps the queue clean and surfaces demand signals
accurately.

::: {.callout .callout-blue}
**The queue is the admin\'s daily work surface.** When an admin opens
the admin UI, the first thing they see is the queue sorted by priority
then request_count. High-demand user requests appear at the top. They
click \"Score Now\" on any entry to run Operation 2. Failed entries show
the error inline and offer a retry button. The queue replaces the v2.1
concept of separate \"miss request\" and \"product browser\" views ---
everything flows through one surface.
:::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

::::::::::::::::::::::::::: {#ops .section .section}
:::::::::::::::::::::::::: container
::: section-eyebrow
Section 03 · Unchanged from v2.1
:::

## The three AI operations {#the-three-ai-operations .section-title}

The three operations are unchanged. The only modification from v2.1 is
that Operation 2 now explicitly handles the alternative auto-queue step
--- when it scores a product and identifies alternatives, it writes any
unseen alternatives directly to the scoring queue. Operation 1 (bulk
seed) and Operation 3 (refresh check) are unchanged in structure.

:::::::::::::::::::::::: ops-grid
::::::::: op-card
::: op-num
1
:::

::: {.op-badge .once}
Run Once
:::

::: op-title
Bulk Seed
:::

::: op-desc
Processes the \~500-product seed list in a single script run. Publishes
all scored products directly to the database. Alternatives identified
during the run are added to the scoring queue for subsequent Operation 2
runs.
:::

::: op-trigger
**Trigger:** Manual script run before launch.
:::

::: op-outputs
[\~500 product records]{.op-out} [Ingredients + modifiers]{.op-out}
[Alternatives → queue]{.op-out}
:::
:::::::::

::::::::: op-card
::: op-num
2
:::

::: {.op-badge .ondemand}
On Demand
:::

::: op-title
Add Product
:::

::: op-desc
Scores one product from the queue and publishes it immediately.
Automatically adds any unscored alternatives to the queue. Triggered
from the admin UI queue view or by the bulk seed\'s alternative pass.
:::

::: op-trigger
**Trigger:** Admin \"Score Now\" button in queue view, or auto-triggered
for alternatives.
:::

::: op-outputs
[1 product record published]{.op-out} [New alternatives →
queue]{.op-out} [Queue entry → done]{.op-out}
:::
:::::::::

::::::::: op-card
::: op-num
3
:::

::: {.op-badge .refresh}
Periodic
:::

::: op-title
Refresh Check
:::

::: op-desc
Re-evaluates all published products for regulatory or evidence changes.
Returns a diff --- not a full re-score. Products with detected changes
are updated immediately. No-change products get a confirmed timestamp.
:::

::: op-trigger
**Trigger:** Manual --- run quarterly or after a major regulatory event.
:::

::: op-outputs
[Changed products updated]{.op-out} [Change reason logged]{.op-out}
[User notifications queued]{.op-out}
:::
:::::::::
::::::::::::::::::::::::
::::::::::::::::::::::::::
:::::::::::::::::::::::::::

::::::::::::::::::::::::::: {#op1 .section .section}
:::::::::::::::::::::::::: container
::: section-eyebrow
Section 04 · Updated --- advisor review removed
:::

## Operation 1 --- Bulk seed {#operation-1-bulk-seed .section-title}

::::: post-mvp-note
::: post-mvp-icon
⚠️
:::

::: post-mvp-text
**Post-MVP change needed:** In MVP, bulk seed output is published
directly after JSON validation. When scientific advisor review is
introduced, scored records should land in a `pending_review` state
instead of publishing immediately. The bulk seed script will need a flag
to toggle between MVP direct-publish and future advisor-gated modes.
:::
:::::

::::::::::::::::::::: op-detail
::::: op-detail-header
::: {.op-detail-num .num-once}
1
:::

::: op-detail-title
Bulk Seed --- one-time database population, \~500 products
:::

[Run Once · Pre-launch]{.op-detail-badge .once}
:::::

::::::::::::::::: op-detail-body
::: op-section-label
What it does
:::

Iterates through the full \~500-product seed list (§12), calls the
Anthropic API once per product, validates the JSON response, and writes
the scored record directly to the products table with `status = scored`.
Any alternative products identified during the run that are not already
in the database are added to the `scoring_queue` with
`source = alternative`. After the main seed completes, the admin can
process the alternative queue using Operation 2.

At \~500 products × 3--5 seconds per call with a 500ms delay between
calls, the full seed run takes approximately 35--50 minutes. It is a
one-time, unattended script run.

::: op-section-label
Script behaviour
:::

The script maintains a local progress log. If it is interrupted mid-run,
it can be resumed from the last successfully written product --- it
checks the database for existing records before each API call and skips
products already scored. Every API response (success or failure) is
written to a run log file for post-run review. Invalid JSON responses
are logged as failures and the product is added to the scoring queue for
individual retry via Operation 2.

::: op-section-label
Prompt specification
:::

:::::::::: prompt-spec
::: prompt-spec-label
API call parameters
:::

::: prompt-field
[model]{.prompt-key}[`claude-sonnet-4-5` --- deterministic,
cost-efficient for batch scoring.]{.prompt-val}
:::

::: prompt-field
[max_tokens]{.prompt-key}[`1500` per product call.]{.prompt-val}
:::

::: prompt-field
[temperature]{.prompt-key}[`0` --- determinism for scoring
consistency.]{.prompt-val}
:::

::: prompt-field
[system]{.prompt-key}[Full CleanList scoring framework (Scoring
Algorithm Spec v1.0). No user profile --- base scores and full
condition_modifier table only.]{.prompt-val}
:::

::: prompt-field
[user
message]{.prompt-key}[`"Score this product for the CleanList database: [PRODUCT NAME, BRAND]"`]{.prompt-val}
:::

::: prompt-field
[output]{.prompt-key}[JSON only. Validated against schema. Published on
valid response. Queued for retry on invalid.]{.prompt-val}
:::
::::::::::

::: op-section-label
Output schema
:::

::: json-block
{ [\"name\"]{.json-key}: [\"Froot Loops Original\"]{.json-str},
[\"brand\"]{.json-key}: [\"Kellogg\'s\"]{.json-str},
[\"emoji\"]{.json-key}: [\"🌈\"]{.json-str},
[\"base_score\"]{.json-key}: [4.5]{.json-num}, [\"tier\"]{.json-key}:
[\"Watch\"]{.json-str}, [\"ingredients\"]{.json-key}: \[ {
[\"canonical_name\"]{.json-key}: [\"FD&C Red No. 40\"]{.json-str},
[\"base_score\"]{.json-key}: [5.2]{.json-num}, [\"tier\"]{.json-key}:
[\"Caution\"]{.json-str}, [\"flag_label\"]{.json-key}: [\"Hyperactivity
link\"]{.json-str}, [\"evidence_sources\"]{.json-key}: \[[\"McCann et
al. 2007 Lancet RCT\"]{.json-str}\] } [// 3--6 key ingredients
total]{.json-comment} \], [\"condition_modifiers\"]{.json-key}: \[ {
[\"condition\"]{.json-key}: [\"ADHD\"]{.json-str},
[\"ingredient_canonical\"]{.json-key}: [\"FD&C Red No. 40\"]{.json-str},
[\"modifier_amount\"]{.json-key}: [2.8]{.json-num},
[\"evidence_citation\"]{.json-key}: [\"McCann et al. 2007 Lancet
RCT\"]{.json-str}, [\"evidence_quality\"]{.json-key}:
[\"RCT\"]{.json-str} } \], [\"alternatives\"]{.json-key}: \[ {
[\"name\"]{.json-key}: [\"Three Wishes Grain-Free Cereal\"]{.json-str},
[\"brand\"]{.json-key}: [\"Three Wishes\"]{.json-str},
[\"why_cleaner\"]{.json-key}: [\"No artificial dyes. Short ingredient
list.\"]{.json-str}, [\"retailer_availability\"]{.json-key}:
\[[\"Target\"]{.json-str}, [\"Whole Foods\"]{.json-str}\] } [// 2
alternatives for Caution/Avoid products only]{.json-comment} \] }
:::

::: {.callout .callout-blue style="margin-top:.75rem;margin-bottom:0"}
**Alternatives are queued, not scored inline.** The bulk seed does not
score alternatives during the main run --- doing so would double the
runtime and API cost. Instead, each unscored alternative is written to
the `scoring_queue` with `source = alternative`. After the main seed,
the admin processes the alternative queue via Operation 2 at their own
pace. Alternatives display with an estimated score label until their own
score run completes.
:::
:::::::::::::::::
:::::::::::::::::::::
::::::::::::::::::::::::::
:::::::::::::::::::::::::::

::::::::::::::::::::::::::: {#op2 .section .section}
:::::::::::::::::::::::::: container
::: section-eyebrow
Section 05 · Updated --- queue integration + advisor review removed
:::

## Operation 2 --- Add product {#operation-2-add-product .section-title}

::::: post-mvp-note
::: post-mvp-icon
⚠️
:::

::: post-mvp-text
**Post-MVP change needed:** Operation 2 currently publishes directly.
When advisor review is introduced, the publish step becomes a write to
`pending_review` state instead.
:::
:::::

::::::::::::::::::::: op-detail
::::: op-detail-header
::: {.op-detail-num .num-ondemand}
2
:::

::: op-detail-title
Add Product --- scores one queue entry and publishes immediately
:::

[On Demand]{.op-detail-badge .ondemand}
:::::

::::::::::::::::: op-detail-body
::: op-section-label
What it does
:::

Takes a single `queue_id` as input. Marks the queue entry as `scoring`,
calls the API with the product name, validates the response, and writes
the new product record to the database with `status = scored`. Marks the
queue entry as `done` and links it to the new product via `product_id`.
For any alternatives in the response that are not yet in the database
and not already in the queue, adds them to the queue with
`source = alternative` and `source_product_id` set.

::: op-section-label
The alternative auto-queue loop
:::

This is the mechanism that makes the database self-expanding. Every time
a product is scored, its alternatives become queue candidates. This
creates a natural coverage expansion: scoring Froot Loops queues Three
Wishes Grain-Free Cereal as an alternative; scoring Three Wishes might
queue one more alternative; and so on. The admin controls the pace by
deciding how many queue entries to process per session --- they are
never forced to score everything immediately.

::::::::::::: flow-inline
::: flow-node
Op 2 scores Product A
:::

::: flow-arrow
→
:::

::: flow-node
Alternatives B, C identified
:::

::: flow-arrow
→
:::

::: {.flow-node .db}
B, C → scoring_queue (if unseen)
:::

::: flow-arrow
→
:::

::: flow-node
Admin scores B via Op 2
:::

::: flow-arrow
→
:::

::: {.flow-node .db}
B\'s alternatives D, E → queue
:::

::: flow-label
The database expands organically --- each score run seeds the next wave
of coverage.
:::
:::::::::::::

::: op-section-label
Priority handling
:::

The admin UI queue view sorts by `priority` ascending, then
`request_count` descending. This means: high-demand user requests
(priority 1, high request_count) surface first. Alternative auto-queue
entries (priority 2) come next. Admin proactive adds (priority 3) appear
last. The admin can override priority on any entry to push it to the
front of the queue.
:::::::::::::::::
:::::::::::::::::::::
::::::::::::::::::::::::::
:::::::::::::::::::::::::::

::::::::: {#op3 .section .section}
:::::::: container
::: section-eyebrow
Section 06 · Unchanged from v2.1
:::

## Operation 3 --- Refresh check {#operation-3-refresh-check .section-title}

Unchanged from v2.1. Re-evaluates all published products in diff mode.
Products with detected changes are updated immediately (no advisor gate
in MVP). Products with no change get a `refresh_confirmed_at` timestamp.
Run quarterly or after a major regulatory event. User notifications
queued on tier change.

::::: post-mvp-note
::: post-mvp-icon
⚠️
:::

::: post-mvp-text
**Post-MVP change needed:** Refresh-triggered score changes currently
publish immediately. When advisor review is introduced, changes with a
tier impact should route to `pending_review` before publishing --- the
stakes of a tier change are higher than a fractional score change.
:::
:::::

::: {.callout .callout-green}
**Refresh prompt runs in diff mode.** The system prompt instructs the
model: \"You are reviewing an existing CleanList score. Return
`{"change": false}` if nothing material has changed since
\[last_scored_date\]. Otherwise return only the changed fields plus a
`change_reason` citing the new regulatory action or study.\" This keeps
the output focused and the review surface minimal.
:::
::::::::
:::::::::

::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: {#schema .section .section}
:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: container
::: section-eyebrow
Section 07 · Updated --- scoring_queue added, status simplified
:::

## Database schema {#database-schema .section-title}

The `scoring_queue` table is new in v2.2. The `products.status` enum is
simplified: the `pending` state (which represented \"awaiting advisor
review\") is removed. Products are either `scored` (live) or `archived`.
A `refresh_confirmed_at` field tracks the last refresh check
confirmation.

:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: schema-grid
:::::::::::::::::: {.schema-card .highlight}
::::: schema-card-header
::: schema-table-name
scoring_queue
:::

::: schema-table-desc
New in v2.2 --- unified queue for all pending scoring work
:::
:::::

:::::::::::::: schema-fields
::: schema-field
[queue_id]{.field-name}[uuid]{.field-type}[PK]{.field-badge .fb-pk}
:::

::: schema-field
[product_name]{.field-name}[text]{.field-type}[required]{.field-badge
.fb-req}
:::

::: schema-field
[source]{.field-name}[enum]{.field-type}[user_request \| admin_add \|
alternative]{.field-badge .fb-req}
:::

::: schema-field
[priority]{.field-name}[integer]{.field-type}[1 \| 2 \| 3]{.field-badge
.fb-req}
:::

::: schema-field
[request_count]{.field-name}[integer]{.field-type}[default
1]{.field-badge .fb-req}
:::

::: schema-field
[source_product_id]{.field-name}[uuid]{.field-type}[FK → products
(nullable)]{.field-badge .fb-fk}
:::

::: schema-field
[status]{.field-name}[enum]{.field-type}[pending \| scoring \| done \|
failed]{.field-badge .fb-req}
:::

::: schema-field
[created_at]{.field-name}[timestamptz]{.field-type}[indexed]{.field-badge
.fb-idx}
:::

::: schema-field
[scored_at]{.field-name}[timestamptz]{.field-type}
:::

::: schema-field
[product_id]{.field-name}[uuid]{.field-type}[FK → products (on
success)]{.field-badge .fb-fk}
:::

::: schema-field
[error_message]{.field-name}[text]{.field-type}
:::
::::::::::::::
::::::::::::::::::

:::::::::::::::::: schema-card
::::: schema-card-header
::: schema-table-name
products
:::

::: schema-table-desc
status enum simplified --- pending state removed
:::
:::::

:::::::::::::: schema-fields
::: schema-field
[product_id]{.field-name}[uuid]{.field-type}[PK]{.field-badge .fb-pk}
:::

::: schema-field
[name]{.field-name}[text]{.field-type}[required]{.field-badge .fb-req}
:::

::: schema-field
[brand]{.field-name}[text]{.field-type}[required]{.field-badge .fb-req}
:::

::: schema-field
[upc]{.field-name}[text\[\]]{.field-type}[indexed]{.field-badge .fb-idx}
:::

::: schema-field
[emoji]{.field-name}[text]{.field-type}
:::

::: schema-field
[base_score]{.field-name}[decimal(4,2)]{.field-type}[required]{.field-badge
.fb-req}
:::

::: schema-field
[tier]{.field-name}[enum]{.field-type}[Clean\|Watch\|Caution\|Avoid]{.field-badge
.fb-req}
:::

::: schema-field
[status]{.field-name}[enum]{.field-type}[scored \|
archived]{.field-badge .fb-new}
:::

::: schema-field
[score_version]{.field-name}[integer]{.field-type}[required]{.field-badge
.fb-req}
:::

::: schema-field
[scored_at]{.field-name}[timestamptz]{.field-type}[indexed]{.field-badge
.fb-idx}
:::

::: schema-field
[refresh_confirmed_at]{.field-name}[timestamptz]{.field-type}
:::
::::::::::::::
::::::::::::::::::

::::::::::::::::: schema-card
::::: schema-card-header
::: schema-table-name
ingredients
:::

::: schema-table-desc
Canonical ingredient reference --- unchanged from v2.1
:::
:::::

::::::::::::: schema-fields
::: schema-field
[ingredient_id]{.field-name}[uuid]{.field-type}[PK]{.field-badge .fb-pk}
:::

::: schema-field
[canonical_name]{.field-name}[text]{.field-type}[unique]{.field-badge
.fb-idx}
:::

::: schema-field
[aliases]{.field-name}[text\[\]]{.field-type}
:::

::: schema-field
[harm_evidence_score]{.field-name}[decimal(4,2)]{.field-type}[required]{.field-badge
.fb-req}
:::

::: schema-field
[regulatory_score]{.field-name}[decimal(4,2)]{.field-type}[required]{.field-badge
.fb-req}
:::

::: schema-field
[avoidance_score]{.field-name}[decimal(4,2)]{.field-type}[required]{.field-badge
.fb-req}
:::

::: schema-field
[base_score]{.field-name}[decimal(4,2)]{.field-type}[required]{.field-badge
.fb-req}
:::

::: schema-field
[tier]{.field-name}[enum]{.field-type}[required]{.field-badge .fb-req}
:::

::: schema-field
[flag_label]{.field-name}[text]{.field-type}
:::

::: schema-field
[evidence_sources]{.field-name}[jsonb]{.field-type}
:::
:::::::::::::
:::::::::::::::::

:::::::::::::: schema-card
::::: schema-card-header
::: schema-table-name
condition_modifiers
:::

::: schema-table-desc
status simplified --- pending state removed
:::
:::::

:::::::::: schema-fields
::: schema-field
[modifier_id]{.field-name}[uuid]{.field-type}[PK]{.field-badge .fb-pk}
:::

::: schema-field
[ingredient_id]{.field-name}[uuid]{.field-type}[FK →
ingredients]{.field-badge .fb-fk}
:::

::: schema-field
[condition]{.field-name}[enum]{.field-type}[indexed]{.field-badge
.fb-idx}
:::

::: schema-field
[modifier_amount]{.field-name}[decimal(4,2)]{.field-type}[required]{.field-badge
.fb-req}
:::

::: schema-field
[evidence_citation]{.field-name}[text]{.field-type}[required]{.field-badge
.fb-req}
:::

::: schema-field
[evidence_quality]{.field-name}[enum]{.field-type}
:::

::: schema-field
[status]{.field-name}[enum]{.field-type}[active \|
archived]{.field-badge .fb-new}
:::
::::::::::
::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

:::::: {#consumer .section .section}
::::: container
::: section-eyebrow
Section 08 · Unchanged from v2.0
:::

## Consumer app {#consumer-app .section-title}

The consumer app is unchanged from v2.0. The only surface impact of
removing the advisor review gate is that the app no longer needs to
distinguish \"AI-scored\" vs. \"advisor-reviewed\" products --- all
products are AI-scored in MVP. The \"Not yet scored\" miss state and
user request flow are unchanged.

::: {.callout .callout-warn}
**Consider an MVP disclosure.** Since scores are AI-generated without
independent expert review in MVP, consider a single line of disclosure
somewhere accessible in the app --- e.g. on the About screen or in the
onboarding: \"Scores are generated by AI using peer-reviewed evidence
and regulatory data. Independent expert review is coming.\" This manages
user expectations and is better than discovering the limitation after
trust is established.
:::
:::::
::::::

:::::::::::::::::::::::::::::: {#admin .section .section}
::::::::::::::::::::::::::::: container
::: section-eyebrow
Section 09 · Updated --- queue as primary view
:::

## Admin UI --- queue-first {#admin-ui-queue-first .section-title}

The v2.2 admin UI is reorganised around the scoring queue as the primary
work surface. The separate \"pending review queue\" and \"miss request
queue\" from v2.1 are merged into one unified queue view. The advisor
review view is removed entirely from MVP scope.

::::::::::::::::::::::::::: feature-list
:::::: feature-row
[P0]{.feat-priority .p0}

<div>

::: feat-name
Scoring queue view --- primary screen
:::

::: feat-desc
Lists all `pending` and `failed` queue entries sorted by priority then
request_count. Columns: product name, source badge
(user/admin/alternative), request count, date added, status. Each row
has a \"Score Now\" button that triggers Operation 2 inline and shows a
progress indicator. Failed entries show error message and a \"Retry\"
button.
:::

</div>

[Replaces v2.1 views]{.feat-tag .ft-updated}
::::::

:::::: feature-row
[P0]{.feat-priority .p0}

<div>

::: feat-name
Add to queue --- manual admin entry
:::

::: feat-desc
A text input at the top of the queue view. Admin types a product name
and hits \"Add to Queue\" --- creates a queue entry with
`source = admin_add`, `priority = 3`. Includes a quick duplicate check
before adding.
:::

</div>

[New]{.feat-tag .ft-new}
::::::

:::::: feature-row
[P0]{.feat-priority .p0}

<div>

::: feat-name
Product database browser
:::

::: feat-desc
Searchable list of all `scored` products with score, tier, and scored
date. Clicking a product shows the full record including ingredient
breakdown and condition modifiers. Provides an \"Add Variation / New
Product\" button that pre-fills the queue with a similar product name.
:::

</div>

[Unchanged from v2.1]{.ft-unchanged}
::::::

:::::: feature-row
[P0]{.feat-priority .p0}

<div>

::: feat-name
Run Refresh Check
:::

::: feat-desc
A button that triggers Operation 3 against all published products. Shows
a progress bar during the run. On completion, shows a summary: \"X
products updated, Y products confirmed unchanged.\" Updated products are
highlighted in the database browser.
:::

</div>

[Unchanged from v2.1]{.ft-unchanged}
::::::

:::::: feature-row
[P1]{.feat-priority .p1}

<div>

::: feat-name
Score version history per product
:::

::: feat-desc
Per-product view of all historical score changes: previous score, new
score, change reason, and date. Visible from the product browser detail
view.
:::

</div>

[Post-launch]{.ft-unchanged}
::::::

:::::: feature-row
[P1]{.feat-priority .p1}

<div>

::: feat-name
Bulk queue processing --- \"Score Next N\"
:::

::: feat-desc
A button to process the top N queue entries automatically in sequence
(e.g. \"Score Next 10\"). Useful after the bulk seed when the
alternative queue needs to be worked through efficiently without
clicking \"Score Now\" one at a time.
:::

</div>

[New]{.feat-tag .ft-new}
::::::
:::::::::::::::::::::::::::
:::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::

::::::::::::::::::::::::::::::::::::: {#features .section .section}
:::::::::::::::::::::::::::::::::::: container
::: section-eyebrow
Section 10 · Updated
:::

## Feature set {#feature-set .section-title}

::: {.section-eyebrow style="margin-bottom:.75rem"}
P0 --- Must ship at launch
:::

::::::::::::::::::: feature-list
:::::: feature-row
[P0]{.feat-priority .p0}

<div>

::: feat-name
Bulk seed script --- \~500 products
:::

::: feat-desc
Scores and publishes the full §12 seed list. Adds unscored alternatives
to scoring_queue. Resumes safely if interrupted. Estimated runtime
35--50 minutes.
:::

</div>

[500 products]{.feat-tag .ft-updated}
::::::

:::::: feature-row
[P0]{.feat-priority .p0}

<div>

::: feat-name
Scoring queue --- database table + deduplication logic
:::

::: feat-desc
The `scoring_queue` table with all three source paths wired up: consumer
app miss request, admin UI add, and alternative auto-queue from
Operation 2.
:::

</div>

[New]{.feat-tag .ft-new}
::::::

:::::: feature-row
[P0]{.feat-priority .p0}

<div>

::: feat-name
Admin UI --- queue view, product browser, refresh trigger
:::

::: feat-desc
All P0 admin views described in §9. Includes \"Score Now\" per queue
entry and \"Add to Queue\" manual input.
:::

</div>

[Simplified]{.feat-tag .ft-updated}
::::::

:::::: feature-row
[P0]{.feat-priority .p0}

<div>

::: feat-name
Consumer app --- onboarding, list, scoring, swap, detail
:::

::: feat-desc
Core consumer loop. Unchanged from v2.0. \"Not yet scored\" miss state
queues user request to scoring_queue.
:::

</div>

[Unchanged]{.ft-unchanged}
::::::
:::::::::::::::::::

::: {.section-eyebrow style="margin-bottom:.75rem"}
P1 --- Post-launch
:::

::::::::::::::: feature-list
:::::: feature-row
[P1]{.feat-priority .p1}

<div>

::: feat-name
Bulk queue processing --- \"Score Next N\"
:::

::: feat-desc
Processes top N queue entries in sequence from the admin UI. Essential
for working through the alternative queue after the bulk seed.
:::

</div>

[New]{.feat-tag .ft-new}
::::::

:::::: feature-row
[P1]{.feat-priority .p1}

<div>

::: feat-name
Paywall, barcode scanning, profile management, feedback nudges
:::

::: feat-desc
Consumer app P1 features. Unchanged from v1.0/v2.0.
:::

</div>

[Unchanged]{.ft-unchanged}
::::::

:::::: feature-row
[P1]{.feat-priority .p1}

<div>

::: feat-name
Scientific advisor review workflow
:::

::: feat-desc
Adds `pending_review` state to products and condition_modifiers.
Advisor-facing review UI. Consumer app label distinguishing reviewed vs.
AI-only scores.
:::

</div>

[Post-MVP]{.feat-tag
style="background:var(--amber-light);color:var(--amber)"}
::::::
:::::::::::::::
::::::::::::::::::::::::::::::::::::
:::::::::::::::::::::::::::::::::::::

:::::: {#tech .section .section}
::::: container
::: section-eyebrow
Section 11 · Unchanged from v2.1
:::

## Technical requirements {#technical-requirements .section-title}

::: compare-wrap
  Requirement                      Specification
  -------------------------------- ---------------------------------------------------------------------------------------------------------------------------------------------------------------
  **AI model (scoring)**           `claude-sonnet-4-5` at temperature 0. Use `claude-opus-4-5` for any product where sonnet returns invalid JSON on retry.
  **max_tokens**                   `1500` per product scoring call.
  **Bulk seed cost estimate**      500 products × \~\$0.005/call = \~\$2.50 total. Alternatives queue adds \~500--1000 further calls over time = \~\$2.50--\$5.00 total post-seed.
  **Ongoing cost**                 Add Product: \~\$0.005 per call on demand. Refresh Check: \~\$0.005 × product count per quarter. At 1,000 products: \~\$5/quarter.
  **Database**                     Postgres (Supabase recommended). scoring_queue table added in v2.2 migration.
  **AI operations runtime**        Node.js or Python functions. Bulk seed runs as a CLI script. Operations 2 and 3 run as serverless functions called by the admin UI.
  **Consumer app score latency**   \<400ms for DB-hit products. \"Not yet scored\" state shown immediately on miss --- no waiting.
  **JSON validation**              Schema validation before every database write. Invalid responses → queue entry marked `failed` with error message. One automatic retry before marking failed.
:::
:::::
::::::

::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: {#seed .section .section}
:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: container
::: section-eyebrow
Section 12 · Expanded --- \~500 products across 14 categories
:::

## Initial 500-product seed list {#initial-500-product-seed-list .section-title}

Selected to cover the complete mainstream US grocery store footprint ---
every aisle a Persona B shopper would visit. Brands and products chosen
for name recognition and high purchase frequency. Alternatives
identified during scoring will add a further \~500--1,000 records to the
queue over the first weeks of operation.

::::::::::::::: seed-stats
::::: seed-stat
::: seed-stat-val
\~500
:::

::: seed-stat-label
Products in seed list
:::
:::::

::::: seed-stat
::: seed-stat-val
14
:::

::: seed-stat-label
Product categories
:::
:::::

::::: seed-stat
::: seed-stat-val
\~\$2.50
:::

::: seed-stat-label
Estimated AI cost for full run
:::
:::::

::::: seed-stat
::: seed-stat-val
\~45 min
:::

::: seed-stat-label
Estimated runtime
:::
:::::
:::::::::::::::

::::::::::::::::::::::::::::::::::::::::::: cat-block
:::::: cat-header
::: cat-emoji
🥣
:::

::: cat-name
Cereals & Hot Cereals
:::

::: cat-count
35 products
:::
::::::

:::::::::::::::::::::::::::::::::::::: product-cols
::: product-item
Froot Loops [Kellogg\'s]{.pi-brand}
:::

::: product-item
Lucky Charms [General Mills]{.pi-brand}
:::

::: product-item
Honey Nut Cheerios [General Mills]{.pi-brand}
:::

::: product-item
Cheerios Original [General Mills]{.pi-brand}
:::

::: product-item
Cap\'n Crunch [Quaker]{.pi-brand}
:::

::: product-item
Frosted Flakes [Kellogg\'s]{.pi-brand}
:::

::: product-item
Cocoa Puffs [General Mills]{.pi-brand}
:::

::: product-item
Trix [General Mills]{.pi-brand}
:::

::: product-item
Cinnamon Toast Crunch [General Mills]{.pi-brand}
:::

::: product-item
Rice Krispies [Kellogg\'s]{.pi-brand}
:::

::: product-item
Corn Flakes [Kellogg\'s]{.pi-brand}
:::

::: product-item
Special K Original [Kellogg\'s]{.pi-brand}
:::

::: product-item
Raisin Bran [Kellogg\'s]{.pi-brand}
:::

::: product-item
Grape Nuts [Post]{.pi-brand}
:::

::: product-item
Honey Bunches of Oats [Post]{.pi-brand}
:::

::: product-item
Frosted Mini-Wheats [Kellogg\'s]{.pi-brand}
:::

::: product-item
Life Cereal Original [Quaker]{.pi-brand}
:::

::: product-item
Honey Smacks [Kellogg\'s]{.pi-brand}
:::

::: product-item
Reese\'s Puffs [General Mills]{.pi-brand}
:::

::: product-item
Golden Grahams [General Mills]{.pi-brand}
:::

::: product-item
Quaker Instant Oatmeal Maple Brown Sugar [Quaker]{.pi-brand}
:::

::: product-item
Quaker Instant Oatmeal Original [Quaker]{.pi-brand}
:::

::: product-item
Cream of Wheat Original [B&G Foods]{.pi-brand}
:::

::: product-item
Bob\'s Red Mill Old Fashioned Oats [Bob\'s Red Mill]{.pi-brand}
:::

::: product-item
Kashi Go Crunch [Kashi]{.pi-brand}
:::

::: product-item
Kashi Heart to Heart [Kashi]{.pi-brand}
:::

::: product-item
Fiber One Original [General Mills]{.pi-brand}
:::

::: product-item
Total Whole Grain [General Mills]{.pi-brand}
:::

::: product-item
Apple Jacks [Kellogg\'s]{.pi-brand}
:::

::: product-item
Corn Pops [Kellogg\'s]{.pi-brand}
:::

::: product-item
Cocoa Krispies [Kellogg\'s]{.pi-brand}
:::

::: product-item
Honey Nut Clusters [General Mills]{.pi-brand}
:::

::: product-item
Count Chocula [General Mills]{.pi-brand}
:::

::: product-item
Nature\'s Path Heritage Flakes [Nature\'s Path]{.pi-brand}
:::

::: product-item
Barbara\'s Puffins Original [Barbara\'s]{.pi-brand}
:::
::::::::::::::::::::::::::::::::::::::
:::::::::::::::::::::::::::::::::::::::::::

::::::::::::::::::::::::::::::::::::::::::::::::::::: cat-block
:::::: cat-header
::: cat-emoji
🥤
:::

::: cat-name
Beverages
:::

::: cat-count
45 products
:::
::::::

:::::::::::::::::::::::::::::::::::::::::::::::: product-cols
::: product-item
Gatorade Lemon-Lime [PepsiCo]{.pi-brand}
:::

::: product-item
Gatorade Fruit Punch [PepsiCo]{.pi-brand}
:::

::: product-item
Gatorade Blue Cherry [PepsiCo]{.pi-brand}
:::

::: product-item
Powerade Mountain Berry Blast [Coca-Cola]{.pi-brand}
:::

::: product-item
Powerade Fruit Punch [Coca-Cola]{.pi-brand}
:::

::: product-item
Capri Sun Fruit Punch [Kraft Heinz]{.pi-brand}
:::

::: product-item
Capri Sun Pacific Cooler [Kraft Heinz]{.pi-brand}
:::

::: product-item
Hi-C Orange Lavaburst [Coca-Cola]{.pi-brand}
:::

::: product-item
Kool-Aid Tropical Punch Jammers [Kraft Heinz]{.pi-brand}
:::

::: product-item
Monster Energy Original [Monster Beverage]{.pi-brand}
:::

::: product-item
Monster Energy Zero Ultra [Monster Beverage]{.pi-brand}
:::

::: product-item
Red Bull Original [Red Bull]{.pi-brand}
:::

::: product-item
Red Bull Sugar Free [Red Bull]{.pi-brand}
:::

::: product-item
5-Hour Energy Original [Innovation Ventures]{.pi-brand}
:::

::: product-item
Celsius Sparkling Orange [Celsius]{.pi-brand}
:::

::: product-item
Prime Hydration Lemonade [Prime]{.pi-brand}
:::

::: product-item
Liquid I.V. Lemon Lime [Liquid I.V.]{.pi-brand}
:::

::: product-item
Tropicana Orange Juice Original [PepsiCo]{.pi-brand}
:::

::: product-item
Minute Maid Orange Juice [Coca-Cola]{.pi-brand}
:::

::: product-item
Ocean Spray Cranberry Cocktail [Ocean Spray]{.pi-brand}
:::

::: product-item
Welch\'s Grape Juice [Welch\'s]{.pi-brand}
:::

::: product-item
Sunny D Tangy Original [Harvest Hill]{.pi-brand}
:::

::: product-item
V8 Original Vegetable Juice [Campbell\'s]{.pi-brand}
:::

::: product-item
Bolthouse Farms Strawberry Banana Smoothie [Bolthouse]{.pi-brand}
:::

::: product-item
Naked Green Machine [PepsiCo]{.pi-brand}
:::

::: product-item
Silk Original Oat Milk [Silk]{.pi-brand}
:::

::: product-item
Oatly Oat Milk Original [Oatly]{.pi-brand}
:::

::: product-item
Ripple Original Pea Milk [Ripple Foods]{.pi-brand}
:::

::: product-item
Snapple Peach Tea [Keurig Dr Pepper]{.pi-brand}
:::

::: product-item
AriZona Green Tea with Honey [AriZona]{.pi-brand}
:::

::: product-item
Lipton Iced Tea Lemon [Unilever]{.pi-brand}
:::

::: product-item
Pure Leaf Sweet Tea [Unilever/PepsiCo]{.pi-brand}
:::

::: product-item
Starbucks Frappuccino Mocha [Starbucks]{.pi-brand}
:::

::: product-item
Starbucks Doubleshot Energy Vanilla [Starbucks]{.pi-brand}
:::

::: product-item
Nesquik Chocolate Milk [Nestlé]{.pi-brand}
:::

::: product-item
TruMoo Chocolate Milk [Dean Foods]{.pi-brand}
:::

::: product-item
Core Power Elite 42g Protein Chocolate [Fairlife]{.pi-brand}
:::

::: product-item
Fairlife 2% Reduced Fat Milk [Fairlife]{.pi-brand}
:::

::: product-item
Bubly Sparkling Water Lime [PepsiCo]{.pi-brand}
:::

::: product-item
LaCroix Sparkling Water Pamplemousse [National Beverage]{.pi-brand}
:::

::: product-item
Spindrift Lemon Sparkling Water [Spindrift]{.pi-brand}
:::

::: product-item
Hint Water Watermelon [Hint]{.pi-brand}
:::

::: product-item
Bai Brasilia Blueberry [Bai Brands]{.pi-brand}
:::

::: product-item
GT\'s Synergy Gingerberry Kombucha [GT\'s Living Foods]{.pi-brand}
:::

::: product-item
Health-Ade Pink Lady Apple Kombucha [Health-Ade]{.pi-brand}
:::
::::::::::::::::::::::::::::::::::::::::::::::::
:::::::::::::::::::::::::::::::::::::::::::::::::::::

:::::::::::::::::::::::::::::::::::::::::::::::::::::::::: cat-block
:::::: cat-header
::: cat-emoji
🍟
:::

::: cat-name
Chips, Crackers & Salty Snacks
:::

::: cat-count
50 products
:::
::::::

::::::::::::::::::::::::::::::::::::::::::::::::::::: product-cols
::: product-item
Doritos Nacho Cheese [Frito-Lay]{.pi-brand}
:::

::: product-item
Doritos Cool Ranch [Frito-Lay]{.pi-brand}
:::

::: product-item
Lay\'s Classic [Frito-Lay]{.pi-brand}
:::

::: product-item
Lay\'s Sour Cream & Onion [Frito-Lay]{.pi-brand}
:::

::: product-item
Lay\'s Barbecue [Frito-Lay]{.pi-brand}
:::

::: product-item
Pringles Original [Kellogg\'s]{.pi-brand}
:::

::: product-item
Pringles Sour Cream & Onion [Kellogg\'s]{.pi-brand}
:::

::: product-item
Cheetos Crunchy [Frito-Lay]{.pi-brand}
:::

::: product-item
Cheetos Puffs [Frito-Lay]{.pi-brand}
:::

::: product-item
Funyuns Onion Flavored Rings [Frito-Lay]{.pi-brand}
:::

::: product-item
Fritos Original [Frito-Lay]{.pi-brand}
:::

::: product-item
Tostitos Original [Frito-Lay]{.pi-brand}
:::

::: product-item
Tostitos Hint of Lime [Frito-Lay]{.pi-brand}
:::

::: product-item
SunChips Original [Frito-Lay]{.pi-brand}
:::

::: product-item
Ruffles Original [Frito-Lay]{.pi-brand}
:::

::: product-item
Ruffles Cheddar & Sour Cream [Frito-Lay]{.pi-brand}
:::

::: product-item
Goldfish Crackers Original [Pepperidge Farm]{.pi-brand}
:::

::: product-item
Goldfish Crackers Cheddar [Pepperidge Farm]{.pi-brand}
:::

::: product-item
Cheez-It Original [Kellogg\'s]{.pi-brand}
:::

::: product-item
Cheez-It White Cheddar [Kellogg\'s]{.pi-brand}
:::

::: product-item
Wheat Thins Original [Nabisco]{.pi-brand}
:::

::: product-item
Triscuit Original [Nabisco]{.pi-brand}
:::

::: product-item
Ritz Crackers Original [Nabisco]{.pi-brand}
:::

::: product-item
Club Crackers Original [Kellogg\'s]{.pi-brand}
:::

::: product-item
Townhouse Crackers Original [Kellogg\'s]{.pi-brand}
:::

::: product-item
Stacy\'s Pita Chips Simply Naked [Frito-Lay]{.pi-brand}
:::

::: product-item
Popchips Original Potato [Popchips]{.pi-brand}
:::

::: product-item
Skinny Pop Original Popcorn [Amplify Snack Brands]{.pi-brand}
:::

::: product-item
Orville Redenbacher Smart Pop Butter [ConAgra]{.pi-brand}
:::

::: product-item
ACT II Butter Lovers Popcorn [ConAgra]{.pi-brand}
:::

::: product-item
Pirate\'s Booty Aged White Cheddar [Pirate Brands]{.pi-brand}
:::

::: product-item
Snyder\'s of Hanover Pretzels Honey Mustard & Onion
[Campbell\'s]{.pi-brand}
:::

::: product-item
Snyder\'s Mini Pretzels [Campbell\'s]{.pi-brand}
:::

::: product-item
Unique \"Extra Dark\" Pretzels [Unique Snacks]{.pi-brand}
:::

::: product-item
Bugles Original [General Mills]{.pi-brand}
:::

::: product-item
Combos Cheddar Cheese Cracker [Mars]{.pi-brand}
:::

::: product-item
Munchies Cheese Fix Snack Mix [Frito-Lay]{.pi-brand}
:::

::: product-item
Chex Mix Original [General Mills]{.pi-brand}
:::

::: product-item
Gardetto\'s Original Recipe Snack Mix [General Mills]{.pi-brand}
:::

::: product-item
Harvest Snaps Green Pea Snacks Lightly Salted [Calbee]{.pi-brand}
:::

::: product-item
Beanitos White Bean Chips [Beanitos]{.pi-brand}
:::

::: product-item
Late July Organic Multigrain Tortilla Chips [Late July]{.pi-brand}
:::

::: product-item
Siete Grain-Free Tortilla Chips Sea Salt [Siete Foods]{.pi-brand}
:::

::: product-item
Simple Mills Almond Flour Crackers [Simple Mills]{.pi-brand}
:::

::: product-item
RW Garcia Sweet Potato Crackers [RW Garcia]{.pi-brand}
:::

::: product-item
Mary\'s Gone Crackers Original [Mary\'s Gone Crackers]{.pi-brand}
:::

::: product-item
Kind Mini Bars Dark Chocolate Nuts & Sea Salt [Kind]{.pi-brand}
:::

::: product-item
RXBar Chocolate Sea Salt [RXBAR]{.pi-brand}
:::

::: product-item
Larabar Apple Pie [General Mills]{.pi-brand}
:::

::: product-item
Cliff Bar Chocolate Chip [Clif Bar]{.pi-brand}
:::
:::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

::::::::::::::::::::::::::::::::::::::::::::::::::::: cat-block
:::::: cat-header
::: cat-emoji
🍫
:::

::: cat-name
Cookies, Candy & Sweets
:::

::: cat-count
45 products
:::
::::::

:::::::::::::::::::::::::::::::::::::::::::::::: product-cols
::: product-item
Oreo Original [Nabisco]{.pi-brand}
:::

::: product-item
Oreo Double Stuf [Nabisco]{.pi-brand}
:::

::: product-item
Oreo Golden [Nabisco]{.pi-brand}
:::

::: product-item
Chips Ahoy! Original [Nabisco]{.pi-brand}
:::

::: product-item
Chips Ahoy! Chewy [Nabisco]{.pi-brand}
:::

::: product-item
Nutter Butter Original [Nabisco]{.pi-brand}
:::

::: product-item
Pepperidge Farm Milano Cookies [Pepperidge Farm]{.pi-brand}
:::

::: product-item
Famous Amos Chocolate Chip Cookies [Ferrero]{.pi-brand}
:::

::: product-item
Lorna Doone Shortbread Cookies [Nabisco]{.pi-brand}
:::

::: product-item
Keebler Fudge Stripes [Kellogg\'s]{.pi-brand}
:::

::: product-item
Twinkies [Hostess]{.pi-brand}
:::

::: product-item
Ding Dongs [Hostess]{.pi-brand}
:::

::: product-item
Little Debbie Oatmeal Creme Pies [McKee Foods]{.pi-brand}
:::

::: product-item
Little Debbie Nutty Bars [McKee Foods]{.pi-brand}
:::

::: product-item
Skittles Original [Mars]{.pi-brand}
:::

::: product-item
Skittles Wild Berry [Mars]{.pi-brand}
:::

::: product-item
Starburst Original [Mars]{.pi-brand}
:::

::: product-item
Twizzlers Strawberry Twists [Hershey\'s]{.pi-brand}
:::

::: product-item
Swedish Fish Original [Mondelēz]{.pi-brand}
:::

::: product-item
Sour Patch Kids Original [Mondelēz]{.pi-brand}
:::

::: product-item
Airheads Original [Perfetti Van Melle]{.pi-brand}
:::

::: product-item
Jolly Rancher Hard Candy Assorted [Hershey\'s]{.pi-brand}
:::

::: product-item
Nerds Original [Ferrara Candy]{.pi-brand}
:::

::: product-item
Haribo Gold-Bears [Haribo]{.pi-brand}
:::

::: product-item
Trolli Sour Brite Crawlers [Ferrara Candy]{.pi-brand}
:::

::: product-item
Mike and Ike Original Fruits [Just Born]{.pi-brand}
:::

::: product-item
M&Ms Milk Chocolate [Mars]{.pi-brand}
:::

::: product-item
M&Ms Peanut [Mars]{.pi-brand}
:::

::: product-item
Snickers Original [Mars]{.pi-brand}
:::

::: product-item
Kit Kat Original [Hershey\'s]{.pi-brand}
:::

::: product-item
Reese\'s Peanut Butter Cups [Hershey\'s]{.pi-brand}
:::

::: product-item
Hershey\'s Milk Chocolate Bar [Hershey\'s]{.pi-brand}
:::

::: product-item
Butterfinger Original [Ferrero]{.pi-brand}
:::

::: product-item
Baby Ruth Original [Ferrero]{.pi-brand}
:::

::: product-item
3 Musketeers [Mars]{.pi-brand}
:::

::: product-item
Milky Way Original [Mars]{.pi-brand}
:::

::: product-item
Almond Joy [Hershey\'s]{.pi-brand}
:::

::: product-item
Mounds [Hershey\'s]{.pi-brand}
:::

::: product-item
Toblerone Milk Chocolate [Mondelēz]{.pi-brand}
:::

::: product-item
Lindt Excellence 70% Cocoa Dark [Lindt]{.pi-brand}
:::

::: product-item
Justin\'s Dark Chocolate Peanut Butter Cups [Justin\'s]{.pi-brand}
:::

::: product-item
Lily\'s Milk Chocolate Chips [Lily\'s]{.pi-brand}
:::

::: product-item
SmartSweets Peach Rings [SmartSweets]{.pi-brand}
:::

::: product-item
YumEarth Organic Gummy Bears [YumEarth]{.pi-brand}
:::

::: product-item
Unreal Dark Chocolate Peanut Butter Cups [Unreal]{.pi-brand}
:::
::::::::::::::::::::::::::::::::::::::::::::::::
:::::::::::::::::::::::::::::::::::::::::::::::::::::

::::::::::::::::::::::::::::::::::::::::::: cat-block
:::::: cat-header
::: cat-emoji
🍝
:::

::: cat-name
Boxed Meals & Pasta
:::

::: cat-count
35 products
:::
::::::

:::::::::::::::::::::::::::::::::::::: product-cols
::: product-item
Kraft Mac & Cheese Original [Kraft Heinz]{.pi-brand}
:::

::: product-item
Kraft Mac & Cheese Shapes [Kraft Heinz]{.pi-brand}
:::

::: product-item
Velveeta Shells & Cheese [Kraft Heinz]{.pi-brand}
:::

::: product-item
Annie\'s Organic Mac & Cheese [General Mills]{.pi-brand}
:::

::: product-item
Maruchan Ramen Chicken [Maruchan]{.pi-brand}
:::

::: product-item
Maruchan Ramen Beef [Maruchan]{.pi-brand}
:::

::: product-item
Top Ramen Chicken [Nissin]{.pi-brand}
:::

::: product-item
Nissin Cup Noodles Chicken [Nissin]{.pi-brand}
:::

::: product-item
Hamburger Helper Cheeseburger Macaroni [General Mills]{.pi-brand}
:::

::: product-item
Rice-A-Roni Chicken Flavor [PepsiCo]{.pi-brand}
:::

::: product-item
Knorr Pasta Sides Chicken Broccoli [Unilever]{.pi-brand}
:::

::: product-item
Pasta Roni Angel Hair & Butter [PepsiCo]{.pi-brand}
:::

::: product-item
Barilla Spaghetti [Barilla]{.pi-brand}
:::

::: product-item
Barilla Penne Rigate [Barilla]{.pi-brand}
:::

::: product-item
Barilla Rotini [Barilla]{.pi-brand}
:::

::: product-item
Ronzoni Garden Delight Rotini [TreeHouse Foods]{.pi-brand}
:::

::: product-item
Banza Chickpea Pasta Penne [Banza]{.pi-brand}
:::

::: product-item
Explore Cuisine Edamame Spaghetti [Explore Cuisine]{.pi-brand}
:::

::: product-item
Near East Couscous Roasted Garlic & Olive Oil [PepsiCo]{.pi-brand}
:::

::: product-item
Uncle Ben\'s Ready Rice Long Grain & Wild [Mars Food]{.pi-brand}
:::

::: product-item
Seeds of Change Organic Brown Rice & Quinoa [Mars Food]{.pi-brand}
:::

::: product-item
Idahoan Instant Mashed Potatoes Four Cheese [Idahoan]{.pi-brand}
:::

::: product-item
Betty Crocker Scalloped Potatoes [General Mills]{.pi-brand}
:::

::: product-item
Knorr Lipton Onion Soup & Dip Mix [Unilever]{.pi-brand}
:::

::: product-item
McCormick Taco Seasoning [McCormick]{.pi-brand}
:::

::: product-item
Chili-Man Mild Chili Seasoning Mix [Tone Brothers]{.pi-brand}
:::

::: product-item
Zatarain\'s Dirty Rice Mix [Mars Food]{.pi-brand}
:::

::: product-item
Old El Paso Taco Shells Hard [General Mills]{.pi-brand}
:::

::: product-item
Old El Paso Flour Tortillas Small [General Mills]{.pi-brand}
:::

::: product-item
Mission Flour Tortillas Soft Taco [Mission Foods]{.pi-brand}
:::

::: product-item
La Banderita Corn Tortillas [Mission Foods]{.pi-brand}
:::

::: product-item
Goya Black Beans [Goya]{.pi-brand}
:::

::: product-item
Ro-Tel Original Diced Tomatoes & Chilies [ConAgra]{.pi-brand}
:::

::: product-item
Progresso Rich & Hearty Chicken Pot Pie Style Soup [General
Mills]{.pi-brand}
:::

::: product-item
Campbell\'s Chunky Classic Chicken Noodle [Campbell\'s]{.pi-brand}
:::
::::::::::::::::::::::::::::::::::::::
:::::::::::::::::::::::::::::::::::::::::::

:::::::::::::::::::::::::::::::::::::::::::::::::::::::::: cat-block
:::::: cat-header
::: cat-emoji
🧊
:::

::: cat-name
Frozen Foods
:::

::: cat-count
50 products
:::
::::::

::::::::::::::::::::::::::::::::::::::::::::::::::::: product-cols
::: product-item
DiGiorno Rising Crust Pepperoni Pizza [Nestlé]{.pi-brand}
:::

::: product-item
DiGiorno Thin & Crispy Three Meat [Nestlé]{.pi-brand}
:::

::: product-item
Red Baron Classic Crust Pepperoni [Schwan\'s]{.pi-brand}
:::

::: product-item
Totino\'s Party Pizza Pepperoni [General Mills]{.pi-brand}
:::

::: product-item
Stouffer\'s Macaroni & Cheese [Nestlé]{.pi-brand}
:::

::: product-item
Stouffer\'s Lasagna with Meat Sauce [Nestlé]{.pi-brand}
:::

::: product-item
Lean Cuisine Glazed Chicken [Nestlé]{.pi-brand}
:::

::: product-item
Healthy Choice Simply Steamers Grilled Chicken Marinara
[ConAgra]{.pi-brand}
:::

::: product-item
Amy\'s Cheese Pizza [Amy\'s Kitchen]{.pi-brand}
:::

::: product-item
Amy\'s Broccoli Cheddar Bake [Amy\'s Kitchen]{.pi-brand}
:::

::: product-item
Birds Eye Steamfresh Mixed Vegetables [ConAgra]{.pi-brand}
:::

::: product-item
Birds Eye Steamfresh Broccoli [ConAgra]{.pi-brand}
:::

::: product-item
Green Giant Broccoli & Cheese Sauce [B&G Foods]{.pi-brand}
:::

::: product-item
Ore-Ida Golden Crinkles [Kraft Heinz]{.pi-brand}
:::

::: product-item
Ore-Ida Tater Tots [Kraft Heinz]{.pi-brand}
:::

::: product-item
McCain Smiles Mashed Potato Shapes [McCain Foods]{.pi-brand}
:::

::: product-item
Eggo Homestyle Waffles [Kellogg\'s]{.pi-brand}
:::

::: product-item
Eggo Buttermilk Waffles [Kellogg\'s]{.pi-brand}
:::

::: product-item
Pillsbury Frozen Mini Pancakes Blueberry [General Mills]{.pi-brand}
:::

::: product-item
Jimmy Dean Sausage Egg & Cheese Croissant [Tyson]{.pi-brand}
:::

::: product-item
Jimmy Dean Original Pork Sausage Patties [Tyson]{.pi-brand}
:::

::: product-item
Hot Pockets Pepperoni Pizza [Nestlé]{.pi-brand}
:::

::: product-item
Hot Pockets Ham & Cheese [Nestlé]{.pi-brand}
:::

::: product-item
Bagel Bites Pepperoni [Ore-Ida]{.pi-brand}
:::

::: product-item
TGI Friday\'s Mozzarella Sticks [Inventure Foods]{.pi-brand}
:::

::: product-item
Jose Ole Beef & Cheese Taquitos [Ruiz Foods]{.pi-brand}
:::

::: product-item
El Monterey Bean & Cheese Burritos [Ruiz Foods]{.pi-brand}
:::

::: product-item
Tyson Crispy Chicken Strips [Tyson]{.pi-brand}
:::

::: product-item
Perdue Chicken Nuggets [Perdue]{.pi-brand}
:::

::: product-item
Foster Farms Corn Dogs [Foster Farms]{.pi-brand}
:::

::: product-item
Applegate Naturals Chicken Nuggets [Applegate]{.pi-brand}
:::

::: product-item
MorningStar Farms Veggie Burger Original [Kellogg\'s]{.pi-brand}
:::

::: product-item
Impossible Burger Patties [Impossible Foods]{.pi-brand}
:::

::: product-item
Beyond Burger Plant-Based Patties [Beyond Meat]{.pi-brand}
:::

::: product-item
Gardein Beefless Burger [Conagra]{.pi-brand}
:::

::: product-item
Ben & Jerry\'s Chocolate Chip Cookie Dough [Unilever]{.pi-brand}
:::

::: product-item
Häagen-Dazs Vanilla [Nestlé]{.pi-brand}
:::

::: product-item
Dreyer\'s Slow Churned Vanilla Bean [Nestlé]{.pi-brand}
:::

::: product-item
Breyers Natural Vanilla [Unilever]{.pi-brand}
:::

::: product-item
Breyers Oreo Cookies & Cream [Unilever]{.pi-brand}
:::

::: product-item
Popsicle Orange Cherry Grape [Unilever]{.pi-brand}
:::

::: product-item
Welch\'s Fruit Snacks Mixed Fruit [Welch\'s]{.pi-brand}
:::

::: product-item
Outshine Strawberry Fruit Bar [Nestlé]{.pi-brand}
:::

::: product-item
Halo Top Vanilla Bean [Halo Top]{.pi-brand}
:::

::: product-item
Enlightened Chocolate Peanut Butter Ice Cream Bar
[Enlightened]{.pi-brand}
:::

::: product-item
Good Culture Cottage Cheese 2% [Good Culture]{.pi-brand}
:::

::: product-item
Evol Truffle Parmesan Mac & Cheese [Conagra]{.pi-brand}
:::

::: product-item
Sweet Earth Protein Lovers Burrito [Nestlé]{.pi-brand}
:::

::: product-item
Caulipower Cauliflower Pizza Margherita [Caulipower]{.pi-brand}
:::

::: product-item
Real Good Foods Chicken Crust Pizza Pepperoni [Real Good
Foods]{.pi-brand}
:::
:::::::::::::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

:::::::::::::::::::::::::::::::::::::: cat-block
:::::: cat-header
::: cat-emoji
🍞
:::

::: cat-name
Bread, Tortillas & Baked Goods
:::

::: cat-count
30 products
:::
::::::

::::::::::::::::::::::::::::::::: product-cols
::: product-item
Wonder Classic White Bread [Flowers Foods]{.pi-brand}
:::

::: product-item
Nature\'s Own Honey Wheat Bread [Flowers Foods]{.pi-brand}
:::

::: product-item
Dave\'s Killer Bread 21 Whole Grains [Flowers Foods]{.pi-brand}
:::

::: product-item
Arnold Whole Wheat Bread [Bimbo Bakeries]{.pi-brand}
:::

::: product-item
Sara Lee Delightful Wheat Bread [Flowers Foods]{.pi-brand}
:::

::: product-item
Pepperidge Farm Farmhouse White [Pepperidge Farm]{.pi-brand}
:::

::: product-item
Thomas\' English Muffins Original [Bimbo Bakeries]{.pi-brand}
:::

::: product-item
Thomas\' Everything Bagels [Bimbo Bakeries]{.pi-brand}
:::

::: product-item
Lender\'s Blueberry Bagels [Bimbo Bakeries]{.pi-brand}
:::

::: product-item
Pepperidge Farm Soft 100% Whole Wheat Hot Dog Rolls [Pepperidge
Farm]{.pi-brand}
:::

::: product-item
Pillsbury Grands! Flaky Biscuits Butter Tastin\' [General
Mills]{.pi-brand}
:::

::: product-item
Pillsbury Crescent Rolls Original [General Mills]{.pi-brand}
:::

::: product-item
Pepperidge Farm Puff Pastry Sheets [Pepperidge Farm]{.pi-brand}
:::

::: product-item
Betty Crocker Blueberry Muffin Mix [General Mills]{.pi-brand}
:::

::: product-item
Bisquick Original Pancake & Baking Mix [General Mills]{.pi-brand}
:::

::: product-item
Aunt Jemima Buttermilk Pancake Mix [Pearl Milling Co.]{.pi-brand}
:::

::: product-item
Krusteaz Buttermilk Pancake Mix [Continental Mills]{.pi-brand}
:::

::: product-item
Pepperidge Farm Stuffing Herb Seasoned [Pepperidge Farm]{.pi-brand}
:::

::: product-item
Mission Flour Tortillas Large [Mission Foods]{.pi-brand}
:::

::: product-item
Old El Paso Stand \'n Stuff Taco Shells [General Mills]{.pi-brand}
:::

::: product-item
Udi\'s Gluten-Free Original Sandwich Bread [Canyon Bakehouse]{.pi-brand}
:::

::: product-item
Canyon Bakehouse Gluten-Free Mountain White Bread [Canyon
Bakehouse]{.pi-brand}
:::

::: product-item
Food for Life Ezekiel 4:9 Sprouted Whole Grain Bread [Food for
Life]{.pi-brand}
:::

::: product-item
Oroweat Whole Grains Double Fiber Bread [Bimbo Bakeries]{.pi-brand}
:::

::: product-item
King\'s Hawaiian Original Hawaiian Sweet Rolls [King\'s
Hawaiian]{.pi-brand}
:::

::: product-item
Brownberry Buttermilk Bread [Bimbo Bakeries]{.pi-brand}
:::

::: product-item
Schmidt Old Tyme 647 Bread [Schmidt Baking Co.]{.pi-brand}
:::

::: product-item
La Tortilla Factory Low Carb Whole Wheat Tortillas [La Tortilla
Factory]{.pi-brand}
:::

::: product-item
Siete Grain-Free Almond Flour Tortillas [Siete Foods]{.pi-brand}
:::

::: product-item
Base Culture Original Keto Bread [Base Culture]{.pi-brand}
:::
:::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::

:::::::::::::::::::::::::::::::::::::::::::::::: cat-block
:::::: cat-header
::: cat-emoji
🥫
:::

::: cat-name
Condiments, Sauces & Pantry
:::

::: cat-count
40 products
:::
::::::

::::::::::::::::::::::::::::::::::::::::::: product-cols
::: product-item
Heinz Tomato Ketchup [Kraft Heinz]{.pi-brand}
:::

::: product-item
Hunt\'s Ketchup No Sugar Added [ConAgra]{.pi-brand}
:::

::: product-item
French\'s Classic Yellow Mustard [McCormick]{.pi-brand}
:::

::: product-item
Grey Poupon Dijon Mustard [Kraft Heinz]{.pi-brand}
:::

::: product-item
Hellmann\'s Real Mayonnaise [Unilever]{.pi-brand}
:::

::: product-item
Miracle Whip Dressing [Kraft Heinz]{.pi-brand}
:::

::: product-item
Heinz Sweet Relish [Kraft Heinz]{.pi-brand}
:::

::: product-item
Vlasic Bread & Butter Chips [Conagra]{.pi-brand}
:::

::: product-item
Prego Traditional Pasta Sauce [Campbell\'s]{.pi-brand}
:::

::: product-item
Ragu Traditional Pasta Sauce [Mizkan]{.pi-brand}
:::

::: product-item
Bertolli Marinara Sauce [Mizkan]{.pi-brand}
:::

::: product-item
Rao\'s Homemade Marinara Sauce [Rao\'s]{.pi-brand}
:::

::: product-item
Classico Sweet Basil Marinara [Kraft Heinz]{.pi-brand}
:::

::: product-item
Jif Creamy Peanut Butter [J.M. Smucker]{.pi-brand}
:::

::: product-item
Skippy Creamy Peanut Butter [Hormel]{.pi-brand}
:::

::: product-item
Smucker\'s Strawberry Jam [J.M. Smucker]{.pi-brand}
:::

::: product-item
Smucker\'s Concord Grape Jelly [J.M. Smucker]{.pi-brand}
:::

::: product-item
Nutella Hazelnut Spread [Ferrero]{.pi-brand}
:::

::: product-item
Hershey\'s Chocolate Syrup [Hershey\'s]{.pi-brand}
:::

::: product-item
Mrs. Butterworth\'s Original Syrup [TreeHouse Foods]{.pi-brand}
:::

::: product-item
Aunt Jemima Original Syrup [Pearl Milling Co.]{.pi-brand}
:::

::: product-item
Hidden Valley Original Ranch Dressing [Clorox]{.pi-brand}
:::

::: product-item
Ken\'s Thousand Island Dressing [Ken\'s Foods]{.pi-brand}
:::

::: product-item
Wish-Bone Italian Dressing [Wish-Bone]{.pi-brand}
:::

::: product-item
Newman\'s Own Caesar Dressing [Newman\'s Own]{.pi-brand}
:::

::: product-item
Kraft Classic Caesar Dressing [Kraft Heinz]{.pi-brand}
:::

::: product-item
Frank\'s RedHot Original Hot Sauce [McCormick]{.pi-brand}
:::

::: product-item
Tabasco Original Red Sauce [McIlhenny Co.]{.pi-brand}
:::

::: product-item
Cholula Original Hot Sauce [McCormick]{.pi-brand}
:::

::: product-item
Sriracha Rooster Sauce [Huy Fong Foods]{.pi-brand}
:::

::: product-item
Heinz 57 Sauce [Kraft Heinz]{.pi-brand}
:::

::: product-item
A.1. Original Sauce [Kraft Heinz]{.pi-brand}
:::

::: product-item
Lea & Perrins Worcestershire Sauce [Kraft Heinz]{.pi-brand}
:::

::: product-item
Kikkoman Soy Sauce [Kikkoman]{.pi-brand}
:::

::: product-item
Bragg Liquid Aminos [Bragg]{.pi-brand}
:::

::: product-item
Ocean\'s Halo No Soy Organic Soy-Free Sauce [Ocean\'s Halo]{.pi-brand}
:::

::: product-item
Pace Chunky Salsa Medium [Campbell\'s]{.pi-brand}
:::

::: product-item
Tostitos Chunky Salsa Medium [Frito-Lay]{.pi-brand}
:::

::: product-item
Sabra Classic Hummus [PepsiCo]{.pi-brand}
:::

::: product-item
Wholly Guacamole Classic [Hormel]{.pi-brand}
:::
:::::::::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::::::::::::

::::::::::::::::::::::::::::::::::::::::::: cat-block
:::::: cat-header
::: cat-emoji
🥛
:::

::: cat-name
Dairy, Eggs & Refrigerated
:::

::: cat-count
35 products
:::
::::::

:::::::::::::::::::::::::::::::::::::: product-cols
::: product-item
Dannon Strawberry Yogurt [Danone]{.pi-brand}
:::

::: product-item
Dannon Light & Fit Greek Strawberry [Danone]{.pi-brand}
:::

::: product-item
Yoplait Original Strawberry [General Mills]{.pi-brand}
:::

::: product-item
Chobani Plain Greek Yogurt [Chobani]{.pi-brand}
:::

::: product-item
Chobani Strawberry Greek Yogurt [Chobani]{.pi-brand}
:::

::: product-item
Activia Strawberry Probiotic Yogurt [Danone]{.pi-brand}
:::

::: product-item
Stonyfield Organic Whole Milk Vanilla [Lactalis]{.pi-brand}
:::

::: product-item
Siggi\'s Plain Whole-Milk Skyr [Arla Foods]{.pi-brand}
:::

::: product-item
Kraft Singles American Cheese [Kraft Heinz]{.pi-brand}
:::

::: product-item
Velveeta Original Pasteurized Cheese [Kraft Heinz]{.pi-brand}
:::

::: product-item
Sargento Shredded Mild Cheddar [Sargento]{.pi-brand}
:::

::: product-item
Tillamook Medium Cheddar [Tillamook]{.pi-brand}
:::

::: product-item
Babybel Original Mini Cheese [Bel Brands]{.pi-brand}
:::

::: product-item
Laughing Cow Original Creamy Swiss [Bel Brands]{.pi-brand}
:::

::: product-item
Philadelphia Original Cream Cheese [Kraft Heinz]{.pi-brand}
:::

::: product-item
Daisy Pure & Natural Sour Cream [Daisy Brand]{.pi-brand}
:::

::: product-item
Breakstone\'s 2% Milkfat Small Curd Cottage Cheese [Kraft
Heinz]{.pi-brand}
:::

::: product-item
Horizon Organic Whole Milk [Danone]{.pi-brand}
:::

::: product-item
Coffee-mate Original Liquid Creamer [Nestlé]{.pi-brand}
:::

::: product-item
Coffee-mate Natural Bliss Oat Milk Creamer [Nestlé]{.pi-brand}
:::

::: product-item
International Delight French Vanilla [Danone]{.pi-brand}
:::

::: product-item
Vital Farms Pasture-Raised Butter [Vital Farms]{.pi-brand}
:::

::: product-item
Land O\'Lakes Unsalted Butter [Land O\'Lakes]{.pi-brand}
:::

::: product-item
I Can\'t Believe It\'s Not Butter! [Upfield]{.pi-brand}
:::

::: product-item
Country Crock Original Buttery Spread [Upfield]{.pi-brand}
:::

::: product-item
Egg Beaters Original [ConAgra]{.pi-brand}
:::

::: product-item
Just Egg Plant-Based Scramble [Eat Just]{.pi-brand}
:::

::: product-item
Bob Evans Original Country Sausage [Post Holdings]{.pi-brand}
:::

::: product-item
Pillsbury Orange Sweet Rolls [General Mills]{.pi-brand}
:::

::: product-item
Sargento String Cheese Original [Sargento]{.pi-brand}
:::

::: product-item
Horizon Organic String Cheese [Danone]{.pi-brand}
:::

::: product-item
Babybel Light Mini Cheese [Bel Brands]{.pi-brand}
:::

::: product-item
Daisy Squeezable Sour Cream [Daisy Brand]{.pi-brand}
:::

::: product-item
Good Culture Cottage Cheese 4% [Good Culture]{.pi-brand}
:::

::: product-item
Kite Hill Almond Milk Yogurt Plain [Kite Hill]{.pi-brand}
:::
::::::::::::::::::::::::::::::::::::::
:::::::::::::::::::::::::::::::::::::::::::

:::::::::::::::::::::::::::::::::::::: cat-block
:::::: cat-header
::: cat-emoji
🥩
:::

::: cat-name
Deli, Processed Meats & Proteins
:::

::: cat-count
30 products
:::
::::::

::::::::::::::::::::::::::::::::: product-cols
::: product-item
Oscar Mayer Classic Beef Franks [Kraft Heinz]{.pi-brand}
:::

::: product-item
Ball Park Beef Franks [Tyson]{.pi-brand}
:::

::: product-item
Hebrew National Beef Franks [ConAgra]{.pi-brand}
:::

::: product-item
Oscar Mayer Turkey Bacon [Kraft Heinz]{.pi-brand}
:::

::: product-item
Applegate Farms Uncured Turkey Bacon [Applegate]{.pi-brand}
:::

::: product-item
Oscar Mayer Original Bologna [Kraft Heinz]{.pi-brand}
:::

::: product-item
Hillshire Farm Smoked Sausage Original [Tyson]{.pi-brand}
:::

::: product-item
Eckrich Smoked Sausage [John Morrell]{.pi-brand}
:::

::: product-item
Johnsonville Original Bratwurst [Johnsonville]{.pi-brand}
:::

::: product-item
Hormel Pepperoni Classic [Hormel]{.pi-brand}
:::

::: product-item
Hormel Black Label Bacon Regular [Hormel]{.pi-brand}
:::

::: product-item
Oscar Mayer Deli Fresh Oven Roasted Chicken Breast [Kraft
Heinz]{.pi-brand}
:::

::: product-item
Boar\'s Head Low Sodium Oven Roasted Turkey [Boar\'s Head]{.pi-brand}
:::

::: product-item
Deli Select Honey Ham [Hillshire Farm]{.pi-brand}
:::

::: product-item
Armour Vienna Sausage Original [Conagra]{.pi-brand}
:::

::: product-item
Spam Classic [Hormel]{.pi-brand}
:::

::: product-item
Spam Lite [Hormel]{.pi-brand}
:::

::: product-item
Hormel Compleats Chicken & Rice [Hormel]{.pi-brand}
:::

::: product-item
StarKist Chunk Light Tuna in Water [StarKist]{.pi-brand}
:::

::: product-item
Bumble Bee Chunk White Albacore Tuna [Bumble Bee]{.pi-brand}
:::

::: product-item
Wild Planet Wild Albacore Tuna [Wild Planet]{.pi-brand}
:::

::: product-item
Chicken of the Sea Pink Salmon [Chicken of the Sea]{.pi-brand}
:::

::: product-item
Sargento Ultra Thin Sliced Swiss [Sargento]{.pi-brand}
:::

::: product-item
Jennie-O Ground Turkey 93/7 [Jennie-O]{.pi-brand}
:::

::: product-item
Tyson Grilled & Ready Chicken Strips [Tyson]{.pi-brand}
:::

::: product-item
Perdue Short Cuts Carved Chicken Breast Original [Perdue]{.pi-brand}
:::

::: product-item
Jack Link\'s Original Beef Jerky [Jack Link\'s]{.pi-brand}
:::

::: product-item
Slim Jim Original Smoked Snack Stick [Conagra]{.pi-brand}
:::

::: product-item
Old Wisconsin Beef Summer Sausage [Kraft Heinz]{.pi-brand}
:::

::: product-item
Bridgford Pepperoni Slices [Bridgford Foods]{.pi-brand}
:::
:::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::

:::::::::::::::::::::::::::::::::::::: cat-block
:::::: cat-header
::: cat-emoji
🍼
:::

::: cat-name
Baby, Toddler & Kids Foods
:::

::: cat-count
30 products
:::
::::::

::::::::::::::::::::::::::::::::: product-cols
::: product-item
Gerber 2nd Foods Apple Blueberry [Nestlé]{.pi-brand}
:::

::: product-item
Gerber 2nd Foods Sweet Potato [Nestlé]{.pi-brand}
:::

::: product-item
Gerber 3rd Foods Pasta Alphabet in Chicken Broth [Nestlé]{.pi-brand}
:::

::: product-item
Gerber Puffs Banana [Nestlé]{.pi-brand}
:::

::: product-item
Gerber Lil\' Crunchies Mild Cheddar [Nestlé]{.pi-brand}
:::

::: product-item
Happy Baby Organic Clearly Crafted Apple Mango [Happy Family]{.pi-brand}
:::

::: product-item
Happy Baby Organics Superfood Puffs Purple Carrot [Happy
Family]{.pi-brand}
:::

::: product-item
Sprout Organic Baby Food Pea Pear Broccoli [Sprout Organics]{.pi-brand}
:::

::: product-item
Beech-Nut Stage 2 Apple & Blueberry [Beech-Nut]{.pi-brand}
:::

::: product-item
Earth\'s Best Organic Stage 2 Winter Squash [Hain Celestial]{.pi-brand}
:::

::: product-item
Plum Organics Just Fruits Variety Pack [Campbell\'s]{.pi-brand}
:::

::: product-item
Once Upon a Farm Organic Cold-Pressed Pouch [Once Upon a
Farm]{.pi-brand}
:::

::: product-item
Similac Pro-Advance Non-GMO Infant Formula [Abbott]{.pi-brand}
:::

::: product-item
Enfamil NeuroPro Infant Formula [Mead Johnson]{.pi-brand}
:::

::: product-item
Parent\'s Choice Infant Formula [Walmart]{.pi-brand}
:::

::: product-item
Annie\'s Organic Bunny Grahams [General Mills]{.pi-brand}
:::

::: product-item
Annie\'s Organic Cheddar Bunnies [General Mills]{.pi-brand}
:::

::: product-item
Nilla Wafers Mini [Nabisco]{.pi-brand}
:::

::: product-item
Teddy Grahams Honey [Nabisco]{.pi-brand}
:::

::: product-item
Keebler Gripz Cinnamon Grahams [Kellogg\'s]{.pi-brand}
:::

::: product-item
Welch\'s Fruit Snacks Mixed Fruit [Welch\'s]{.pi-brand}
:::

::: product-item
Motts Fruit Snacks Assorted [Mott\'s]{.pi-brand}
:::

::: product-item
Annie\'s Organic Bunny Fruit Snacks Tropical Treat [General
Mills]{.pi-brand}
:::

::: product-item
Horizon Organic Whole Milk Boxes [Danone]{.pi-brand}
:::

::: product-item
Stonyfield YoBaby Organic Whole Milk Yogurt Peach [Lactalis]{.pi-brand}
:::

::: product-item
Danimals Strawberry Explosion Smoothie [Danone]{.pi-brand}
:::

::: product-item
Go-GURT Strawberry Banana Yogurt Tube [General Mills]{.pi-brand}
:::

::: product-item
Kraft Easy Mac Original [Kraft Heinz]{.pi-brand}
:::

::: product-item
Lunchables Turkey & Cheddar with Crackers [Kraft Heinz]{.pi-brand}
:::

::: product-item
Lunchables Pizza with Pepperoni [Kraft Heinz]{.pi-brand}
:::
:::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::

:::::::::::::::::::::::::::::::::::::: cat-block
:::::: cat-header
::: cat-emoji
🥞
:::

::: cat-name
Breakfast Bars, Granola & Nutrition Bars
:::

::: cat-count
30 products
:::
::::::

::::::::::::::::::::::::::::::::: product-cols
::: product-item
Nature Valley Oats \'n Honey Bar [General Mills]{.pi-brand}
:::

::: product-item
Nature Valley Sweet & Salty Almond [General Mills]{.pi-brand}
:::

::: product-item
Nutri-Grain Strawberry Bar [Kellogg\'s]{.pi-brand}
:::

::: product-item
Nutri-Grain Apple Cinnamon Bar [Kellogg\'s]{.pi-brand}
:::

::: product-item
Special K Chocolate Almond Protein Bar [Kellogg\'s]{.pi-brand}
:::

::: product-item
Quaker Chewy Chocolate Chip Granola Bar [Quaker]{.pi-brand}
:::

::: product-item
Quaker Chewy Dipps Chocolate Chip [Quaker]{.pi-brand}
:::

::: product-item
Fiber One Chocolate Fudge Brownie [General Mills]{.pi-brand}
:::

::: product-item
Kind Bar Dark Chocolate Nuts & Sea Salt [Kind]{.pi-brand}
:::

::: product-item
Kind Breakfast Oats & Honey Bar [Kind]{.pi-brand}
:::

::: product-item
RXBar Chocolate Sea Salt [RXBAR]{.pi-brand}
:::

::: product-item
RXBar Blueberry [RXBAR]{.pi-brand}
:::

::: product-item
Larabar Apple Pie [General Mills]{.pi-brand}
:::

::: product-item
Larabar Peanut Butter Chocolate Chip [General Mills]{.pi-brand}
:::

::: product-item
Clif Bar Chocolate Chip [Clif Bar]{.pi-brand}
:::

::: product-item
Clif Bar Crunchy Peanut Butter [Clif Bar]{.pi-brand}
:::

::: product-item
Luna Bar Chocolate Dipped Coconut [Clif Bar]{.pi-brand}
:::

::: product-item
Quest Bar Chocolate Chip Cookie Dough [Quest Nutrition]{.pi-brand}
:::

::: product-item
Quest Bar Birthday Cake [Quest Nutrition]{.pi-brand}
:::

::: product-item
One Bar Birthday Cake [ONE Brands]{.pi-brand}
:::

::: product-item
Atkins Chocolate Peanut Butter Bar [Atkins]{.pi-brand}
:::

::: product-item
Think! Protein Bar Chocolate Fudge [thinkThin]{.pi-brand}
:::

::: product-item
Perfect Bar Dark Chocolate Chip Peanut Butter [Perfect Bar]{.pi-brand}
:::

::: product-item
GoMacro MacroBar Peanut Butter Chocolate Chip [GoMacro]{.pi-brand}
:::

::: product-item
Rise Bar Sunflower Cinnamon Protein [Rise Bar]{.pi-brand}
:::

::: product-item
Kashi Chewy Granola Bar Dark Chocolate Coconut [Kashi]{.pi-brand}
:::

::: product-item
Cascadian Farm Organic Chewy Granola Bar Dark Chocolate [General
Mills]{.pi-brand}
:::

::: product-item
Bear Naked Granola Fruit & Nut [Kellanova]{.pi-brand}
:::

::: product-item
Purely Elizabeth Original Ancient Grain Granola [Purely
Elizabeth]{.pi-brand}
:::

::: product-item
KIND Healthy Grains Oats & Honey Clusters [Kind]{.pi-brand}
:::
:::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::

:::::::::::::::::::::::::::: cat-block
:::::: cat-header
::: cat-emoji
💪
:::

::: cat-name
Sports Nutrition & Supplements
:::

::: cat-count
20 products
:::
::::::

::::::::::::::::::::::: product-cols
::: product-item
Optimum Nutrition Gold Standard 100% Whey Double Rich Chocolate
[Glanbia]{.pi-brand}
:::

::: product-item
Orgain Organic Protein Powder Chocolate Fudge [Orgain]{.pi-brand}
:::

::: product-item
Garden of Life Raw Organic Protein Vanilla [Nestlé]{.pi-brand}
:::

::: product-item
Vega Sport Premium Protein Chocolate [Danone]{.pi-brand}
:::

::: product-item
Muscle Milk Genuine Protein Shake Chocolate [Hormel]{.pi-brand}
:::

::: product-item
Premier Protein Shake Chocolate [Post Holdings]{.pi-brand}
:::

::: product-item
Ensure Original Nutrition Shake Vanilla [Abbott]{.pi-brand}
:::

::: product-item
Boost Original Vanilla Drink [Nestlé]{.pi-brand}
:::

::: product-item
Glucerna Snack Shake Homemade Vanilla [Abbott]{.pi-brand}
:::

::: product-item
Odwalla Protein Shake Chocolate [Coca-Cola]{.pi-brand}
:::

::: product-item
Body Armor Fruit Punch [Coca-Cola]{.pi-brand}
:::

::: product-item
Nuun Sport Electrolyte Tablets Lemon Lime [Nuun]{.pi-brand}
:::

::: product-item
Clif Shot Energy Gel Chocolate [Clif Bar]{.pi-brand}
:::

::: product-item
GU Energy Gel Vanilla Bean [GU Energy Labs]{.pi-brand}
:::

::: product-item
Hammer Gel Chocolate [Hammer Nutrition]{.pi-brand}
:::

::: product-item
Gatorade Recover 03 Protein Shake Chocolate [PepsiCo]{.pi-brand}
:::

::: product-item
Kellogg\'s Special K Protein Shake French Vanilla
[Kellogg\'s]{.pi-brand}
:::

::: product-item
Isopure Zero Carb Protein Powder Dutch Chocolate [Isopure]{.pi-brand}
:::

::: product-item
Pure Protein Bar Chocolate Peanut Butter [Worldwide Sport]{.pi-brand}
:::

::: product-item
Gatorade Fast Twitch Berry [PepsiCo]{.pi-brand}
:::
:::::::::::::::::::::::
::::::::::::::::::::::::::::

::::::::::::::::::::::::::::::::: cat-block
:::::: cat-header
::: cat-emoji
🌿
:::

::: cat-name
Natural, Organic & Specialty
:::

::: cat-count
25 products
:::
::::::

:::::::::::::::::::::::::::: product-cols
::: product-item
Trader Joe\'s Everything But the Bagel Seasoning [Trader
Joe\'s]{.pi-brand}
:::

::: product-item
Primal Kitchen Avocado Oil Mayo [Kraft Heinz]{.pi-brand}
:::

::: product-item
Chosen Foods Avocado Oil [Chosen Foods]{.pi-brand}
:::

::: product-item
Bragg Apple Cider Vinegar [Bragg]{.pi-brand}
:::

::: product-item
Bob\'s Red Mill Organic Chia Seeds [Bob\'s Red Mill]{.pi-brand}
:::

::: product-item
Navitas Organics Hemp Seeds [Navitas]{.pi-brand}
:::

::: product-item
Thrive Market Organic Coconut Sugar [Thrive Market]{.pi-brand}
:::

::: product-item
Now Foods Organic Stevia Packets [Now Foods]{.pi-brand}
:::

::: product-item
Monkfruit In The Raw Zero Calorie Sweetener [In The Raw]{.pi-brand}
:::

::: product-item
Splenda Original Sweetener [Splenda]{.pi-brand}
:::

::: product-item
Equal Original Sweetener [Equal]{.pi-brand}
:::

::: product-item
Sweet\'N Low Zero Calorie Sweetener [Sweet\'N Low]{.pi-brand}
:::

::: product-item
Stevia In The Raw Packets [In The Raw]{.pi-brand}
:::

::: product-item
Vital Proteins Collagen Peptides Unflavored [Nestlé]{.pi-brand}
:::

::: product-item
Ancient Nutrition Multi Collagen Protein [Ancient Nutrition]{.pi-brand}
:::

::: product-item
OLIPOP Classic Root Beer [Olipop]{.pi-brand}
:::

::: product-item
Poppi Apple Cider Vinegar Prebiotic Soda [Poppi]{.pi-brand}
:::

::: product-item
Siete Foods Sea Salt Tortilla Chips [Siete Foods]{.pi-brand}
:::

::: product-item
Simple Mills Almond Flour Vanilla Frosting [Simple Mills]{.pi-brand}
:::

::: product-item
Bob\'s Red Mill 1-to-1 Baking Flour Gluten-Free [Bob\'s Red
Mill]{.pi-brand}
:::

::: product-item
Anthony\'s Organic Coconut Flour [Anthony\'s]{.pi-brand}
:::

::: product-item
Primal Kitchen Buffalo Sauce [Kraft Heinz]{.pi-brand}
:::

::: product-item
Thrive Market Organic Cassava Flour Tortillas [Thrive Market]{.pi-brand}
:::

::: product-item
Hu Chocolate Gems [Mondelēz]{.pi-brand}
:::

::: product-item
Enjoy Life Semi-Sweet Chocolate Mini Chips [Mondelēz]{.pi-brand}
:::
::::::::::::::::::::::::::::
:::::::::::::::::::::::::::::::::

::: {.callout .callout-warn style="margin-top:1rem"}
**Total seed list: \~500 products across 14 categories.** Alternatives
identified during the bulk seed run will add approximately 500--1,000
further products to the scoring queue. Post-seed database coverage is
expected to be 1,000--1,500 products within the first month of
operation, covering nearly all products a mainstream US shopper would
encounter.
:::
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

::::::::::::::::::::::::: {#risks .section .section}
:::::::::::::::::::::::: container
::: section-eyebrow
Section 13 · Updated
:::

## Risks --- updated for v2.2 {#risks-updated-for-v2.2 .section-title}

::::::: risk-block
::::: risk-header
::: risk-num
1
:::

::: risk-title-text
Score accuracy without advisor review
:::
:::::

::: risk-body
Removing the advisor review gate means AI-generated scores go live
without independent verification. The risk is a score that is
meaningfully wrong --- either over-flagging a safe ingredient or
under-flagging a harmful one. **Mitigation: add an in-app disclosure
during MVP (\"Scores are AI-generated using peer-reviewed evidence and
regulatory data --- independent expert review coming soon\"). Build the
advisor review workflow as the first post-MVP feature.** Monitor for
user feedback flagging specific score disagreements and use these as the
first priority inputs for the advisor when that workflow is ready.
:::
:::::::

::::::: risk-block
::::: risk-header
::: risk-num
2
:::

::: risk-title-text
Queue growth outpacing admin capacity
:::
:::::

::: risk-body
The alternative auto-queue means the queue grows automatically. After
the \~500-product bulk seed, approximately 500--1,000 alternative
entries will land in the queue. Processing each via Operation 2 takes
\~5 seconds of AI time plus admin time to trigger. The P1 \"Score Next
N\" bulk processing feature is important for managing this without
requiring the admin to click 1,000 times. **Prioritise building \"Score
Next N\" as the first post-launch admin feature.**
:::
:::::::

::::::: risk-block
::::: risk-header
::: risk-num
3
:::

::: risk-title-text
Bulk seed runtime and failure handling
:::
:::::

::: risk-body
At \~500 products, the bulk seed takes 35--50 minutes. API failures,
rate limits, or invalid JSON responses mid-run need to be handled
gracefully. **The script must be resumable** --- it should check the
database for existing records before each call and skip already-scored
products. Failed products should be written to the scoring queue (not
lost) so they can be retried via Operation 2. Test the script against
10--20 products before running the full 500.
:::
:::::::

::::::: risk-block
::::: risk-header
::: risk-num
4
:::

::: risk-title-text
Regulatory lag --- unchanged
:::
:::::

::: risk-body
Without an automated event listener, there will be a lag between
regulatory events and database updates. Accepted MVP trade-off. Admin
subscribes to FDA/EFSA feeds and manually triggers targeted refresh
checks on affected products. Operation 3 (Refresh Check) is the
mitigation.
:::
:::::::
::::::::::::::::::::::::
:::::::::::::::::::::::::

:::::::::::::::::::::::::::::::::::::: {#next .section .section}
::::::::::::::::::::::::::::::::::::: container
::: section-eyebrow
Section 14 · Updated
:::

## Next steps {#next-steps .section-title}

::::::::::::::::::::::::::::::::::: steps-grid
:::::: step-row
::: step-n
1
:::

::: step-text
**Stand up the database.** Create the schema (§7) including the new
`scoring_queue` table. Supabase recommended. Set up read-only consumer
key and write key for AI operations. Half a day.
:::

::: step-horizon
Day 1--2
:::
::::::

:::::: step-row
::: step-n
2
:::

::: step-text
**Build the bulk seed script (Operation 1).** Iterates the §12 list,
calls the scoring API, validates JSON, writes to products table. Must be
resumable. Test against 20 products first, then run the full 500.
:::

::: step-horizon
Sprint 1 · Days 2--5
:::
::::::

:::::: step-row
::: step-n
3
:::

::: step-text
**Run the bulk seed.** Execute against all \~500 products. Review the
run log for failures. Failed products are added to the scoring queue
automatically for Operation 2 retry. Expect 35--50 minutes runtime.
:::

::: step-horizon
Sprint 1 · end
:::
::::::

:::::: step-row
::: step-n
4
:::

::: step-text
**Build the admin UI --- queue view and product browser.** Queue view
with \"Score Now\" per entry and \"Add to Queue\" input. Product browser
for reviewing scored records. This is needed to process the alternative
queue generated by the bulk seed.
:::

::: step-horizon
Sprint 2
:::
::::::

:::::: step-row
::: step-n
5
:::

::: step-text
**Build the consumer app against the live database.** DB lookup flow,
local personal score calculation, \"Not yet scored\" miss state that
adds to scoring queue. Can run in parallel with step 4 using seeded
products as fixtures.
:::

::: step-horizon
Sprint 2--3
:::
::::::

:::::: step-row
::: step-n
6
:::

::: step-text
**Process the alternative queue.** Use the admin UI to work through the
\~500--1,000 alternative entries generated by the bulk seed. Build
\"Score Next N\" (P1) to make this efficient. This expands coverage to
\~1,000--1,500 products before any user goes live.
:::

::: step-horizon
Sprint 3
:::
::::::

:::::: step-row
::: step-n
7
:::

::: step-text
**Run 10--15 Persona B user interviews.** Test with the live
database-backed app. Validate score trust, swap acceptance, the \"Not
yet scored\" UX, and willingness to pay. Note any specific products that
returned miss results for prioritised queue processing.
:::

::: step-horizon
Month 2
:::
::::::

:::::: step-row
::: step-n
8
:::

::: step-text
**Post-MVP: design and build scientific advisor review workflow.**
Define the `pending_review` state, build the advisor-facing review UI,
add the reviewed indicator to the consumer app. This is the most
important post-launch credibility investment.
:::

::: step-horizon
Post-launch · Month 3+
:::
::::::
:::::::::::::::::::::::::::::::::::
:::::::::::::::::::::::::::::::::::::
::::::::::::::::::::::::::::::::::::::

CleanList · Product Requirements Document v2.2 · March 2026 ·
Confidential --- for partner review only
