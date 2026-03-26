# Clarvn — Architecture Document v3.4

> Architecture Document · v3.4 · March 2026 · Confidential

## Clarvn — Architecture Document

Updates v3.3 with premium paywall architecture informed by the Paywall Strategy v1.0: three-tier model (Free / Premium / Family), authoritative feature boundary table, six upgrade-moment gates with preconditions, three-phase Stripe integration path, trial mechanics, and expanded users schema fields. Product renamed from CleanList to Clarvn.

> v3.4 scope: Incorporates the Premium Paywall Strategy v1.0 into the architecture. §4 users schema gains phased Stripe fields. §6.6 Premium Paywall is fully rewritten with the authoritative feature boundary table, upgrade moment gates, trial mechanics, and Stripe integration phases. §8 Security and §9–10 updated. New and updated items are marked NEW / UPDATED.


---

### Section 01

## System Overview

Clarvn evaluates grocery products by scoring **ingredients** individually, then assembling **product scores** deterministically. The v3 UI redesign adds a consumer experience layer on top of the scoring engine: personalized product discovery, a persistent pantry with a household health score, wellness check-ins, and a three-tier premium subscription model (Free / Premium / Family).

> Core pipeline unchanged. The ingredient-first scoring pipeline, weighted-worst assembly formula, and all Convex function patterns from v3.1 are retained exactly. This document describes the consumer experience layer and paywall architecture built on top of that pipeline.


### New Consumer Concepts

6-screen structured chip flow + value preview screen. Runs before auth to show value first. Screens: (1) Motivation, (2) Conditions, (3) Sensitivities, (4) Dietary Restrictions, (5) Household, (6) Specific Ingredients. Preview shows active flag count + category pills with CTA to create account or "Explore without an account."

Persistent product collection. Aggregate "pantry health score" across all saved products. Stats: products tracked, clean-rated count.

Per-product, per-user match score (0–100%) showing how well a product aligns with the user's profile flags. Powers "Products that match you" and explore sorting.

Products organized into categories with faceted filtering: free-from filters, certifications, score range, price. Sidebar + pill filters.

Structured boolean flags per product: Gluten-free, USDA Organic, Non-GMO, No artificial dyes, etc. "What's inside" grid on product detail.

Daily 5-point emoji mood tracker. Stored per user per day. Future: correlate with diet changes over time.

Free tier shows limited results. Premium unlocks full explore, comparison tool, advanced filters. Subscription status on user record.


---

### Section 02 · Unchanged

## Scoring Pipeline

Unchanged from v3.1. Six-step pipeline: Extraction → Lookup → Ingredient Scoring → Assembly → Personalization → Alternatives. The UI redesign consumes the output but does not modify the pipeline.

> New downstream consumer: The profile match % calculation reads from ingredient scores, product claims, and user profile. It's a new Convex query, not a new pipeline step.


---

### Section 03 · Updated

## Technology Stack

| Layer | Technology |
|---|---|
| **Backend** | Convex — 10 tables (v3.1) + 4 new tables (v3.2) = 14 tables. |
| **AI** | `claude-sonnet-4-5` (scoring), `claude-sonnet-4-6` (alternatives + claims extraction). UPDATED `claude-haiku-4-5` profile-parsing action retired — structured chip inputs no longer require AI parsing. |
| **Data** | Open Food Facts (ingredients + categories + certifications + images). AI fallback. |
| **Auth** | `@convex-dev/auth` — email/password. Social login planned. |
| **Frontend** | Next.js 16 + React 19 + TailwindCSS v4. NEW SkinSort-inspired design system (teal/gray/white). |
| **Payments** NEW | Stripe (planned). Manual `isPremium` flag for MVP. |
| **Hosting** | Convex cloud + Vercel. |


---

### Section 04 · Updated

## Database Schema — New & Changed

Only new/changed tables shown. All v3.1 tables retained unchanged unless noted.

| Field | Type | Notes |
|---|---|---|
| `userId` | v.string() | Auth tokenIdentifier. |
| `productId` | v.id("products") | FK to products. |
| `addedAt` | v.number() | Timestamp. |

| Field | Type | Notes |
|---|---|---|
| `userId` | v.string() |  |
| `date` | v.string() | ISO date "2026-03-25". Unique per user. |
| `mood` | v.number() | 1–5 (rough → great). |
| `notes` | v.optional(v.string()) |  |

| Field | Type | Notes |
|---|---|---|
| `productId` | v.id("products") |  |
| `claim` | v.string() | "gluten_free", "usda_organic", "non_gmo", "no_artificial_dyes", "no_preservatives", "vegan", "peanut_free", etc. |
| `verified` | v.boolean() | True = from OFF or label. False = AI-inferred. |
| `source` | v.string() | "open_food_facts" | "ai_extraction" | "admin" |

| Field | Type | Notes |
|---|---|---|
| `title` | v.string() |  |
| `category` | v.string() | "deep_dive" | "watch_list" | "news" |
| `emoji` | v.string() |  |
| `slug` | v.string() | URL slug. |
| `body` | v.optional(v.string()) | Markdown. |
| `publishedAt` | v.number() |  |

| New Field | Type | Notes |
|---|---|---|
| `category` | v.optional(v.string()) | "pantry_staples", "snacks", "dairy", "beverages", "baby_kids", etc. |
| `subcategory` | v.optional(v.string()) | "Pasta & Grains", "Chips", etc. |
| `price` | v.optional(v.number()) | USD. From retailer data or manual. |
| `imageUrl` | v.optional(v.string()) | From OFF or manual upload. |
| `averageRating` | v.optional(v.number()) | 1–5. From retailer or OFF. |
| `reviewCount` | v.optional(v.number()) |  |
| `retailers` | v.optional(v.array(v.string())) | ["Target", "Whole Foods", "Walmart"] |
| `size` | v.optional(v.string()) | "6 oz", "12 fl oz" |
| `description` | v.optional(v.string()) | Short product description. |

| New Field | Type | Notes |
|---|---|---|
| `ingredientFunction` | v.optional(v.string()) | "Emulsifier", "Natural colorant", "Preservative", etc. AI-generated during scoring. |
| `detailExplanation` | v.optional(v.string()) | Plain-language explanation for ingredient detail panel. AI-generated. |

| Field | Type | Phase | Notes |
|---|---|---|---|
| `isPremium` | v.optional(v.boolean()) | Phase 0 | True for paying subscribers. Manual for MVP. **Server-side check must also validate `premiumUntil > Date.now()`** — never rely on `isPremium` alone. |
| `premiumUntil` | v.optional(v.number()) | Phase 0 | Unix timestamp for subscription expiry. Used with `isPremium` for all gating checks. Also controls trial expiry. Expiry causes a silent downgrade to free — no modal, no data loss. |
| `isComplimentary` NEW | v.optional(v.boolean()) | Phase 0 | True when premium was granted manually by an admin (beta testers, press, founding cohort, etc.). Distinguishes complimentary from paid/trial accounts. Does not affect gating logic — `isPremium` + `premiumUntil` still control access. Allows future reporting to separate complimentary from revenue. |
| `grantedBy` NEW | v.optional(v.string()) | Phase 0 | userId of the admin who granted complimentary access. Null for paid/trial users. Audit trail for manual grants. |
| `stripeCustomerId` | v.optional(v.string()) | Phase 1 | Set on first Stripe Checkout session creation. |
| `stripeSubscriptionId` | v.optional(v.string()) | Phase 1 | Active subscription ID. Null if on free tier or manual flag. |
| `subscriptionStatus` NEW | v.optional(v.string()) | Phase 1 | "active" | "trialing" | "canceled" | "past_due". Synced from Stripe webhooks. Used for granular UI states — "past_due" shows a payment banner, not a hard feature lock. "trialing" shows trial-days-remaining banner. |
| `planTier` NEW | v.optional(v.union(...)) | Phase 2 | "premium" | "family". Needed when Family tier launches to gate multi-profile features separately from base Premium. Until then, all premium users implicitly have `planTier: "premium"` . |

| New Field | Type | Notes |
|---|---|---|
| `dietaryRestrictions` NEW | v.array(v.string()) | Gluten-free, Dairy-free, Vegan, Vegetarian, Nut-free, Soy-free, Low sodium, Kosher, Halal. Hard filters — products failing these are excluded from recommendations entirely, not just score-adjusted. |
| `householdMembers` NEW | v.array(v.object({...})) | Array of {role: string, ageRange?: string}. Roles: "partner", "baby", "toddler", "child", "teen", "pregnant". Per-member `conditions` dropped from MVP scope — conditions apply to the primary user only. Multiple members of the same role are allowed. |
| `ingredientsToAvoid` NEW | v.array(v.string()) | Explicit ingredient avoidance list: "Red 40", "BHT", "HFCS", etc. Empty array `[]` means explicitly skipped; `null` / absent means not yet answered. This distinction matters for analytics. |
| `lifeStage` UPDATED | v.optional(v.string()) | **"just_me" | "household"** — sourced from Screen 5 ("Who are you shopping for?"). Replaces previous v3.2 definition ("pregnant" | "nursing"). Primary user pregnancy is captured via `conditions[]` (Screen 2 chip). If migrating from v3.2, existing "pregnant"/"nursing" values should be backfilled into `conditions` . |


---

### Section 05

## Profile Match % Formula NEW

A per-product, per-user percentage (0–100%) showing how well a product fits the user's profile. Computed at query time, not stored.

```
Match % = (matched flags / total active flags) × 100

active flags = conditions + sensitivities + dietaryRestrictions
             + householdMembers flags (baby_safe, toddler_safe, etc.)
             + ingredientsToAvoid
matched = flag is satisfied by this product
  (no offending ingredient for that condition, matching claim present,
   or avoided ingredient absent from product's ingredient list)

Example:
  User flags: [gluten_free, no_red_40, low_sodium, peanut_free, baby_safe]
  Product satisfies all 5 → 100% match
  Product fails gluten check → 4/5 = 80% match
```

Convex query joins `user_profiles` flags (including dietaryRestrictions, householdMembers, and ingredientsToAvoid) against `product_claims` and checks ingredient lists for avoided ingredients. For products missing claims data, match % is withheld ("Not enough data") rather than showing a misleading number.


---

### Section 06 · New

## UI Redesign — Feature Architecture


### 6.1 Home Dashboard

Personalized dashboard replacing the 3-panel layout. Hero search card, quick action grid (Analyze ingredients, Compare products, Find safer swaps, Pantry health score), curated "Products that match you" section, educational content cards, sidebar with wellness check-in, pantry stats, and health profile summary.

**Queries needed:** Personalized product recommendations (sorted by match %), pantry aggregate stats, today's check-in status, content articles, profile summary.


### 6.2 Explore / Category Browsing

Full-catalog browse with category pill filters, sidebar faceted filters (free-from, certifications, score range, price), sort options (best match, highest score, most reviewed, price), paginated results with product cards showing match badge, save button, brand, name, price, rating.

**Queries needed:** Paginated product query with compound filters (category + claims + tier + price). Products needs `category` and `tier` indexes. Claims filtering via `product_claims` join. Premium gating on result count.


### 6.3 Product Detail

Product hero (image, brand, name, rating, description, CTAs), score card (gradient by tier, large score number), retailers card. Below: "What's inside" claims grid, ingredients list with expandable detail panels (function + explanation + profile-specific notes), "Why this works for you" personalization callout, alternatives, "Add to pantry" CTA.

**Queries needed:** Product claims, ingredient functions and detail explanations, retailers, profile match explanation, alternatives.


### 6.4 Pantry

Persistent product collection. Pantry health score = average of pantry product base scores. Stats: products tracked, clean-rated count. Full pantry view with sort/filter.

**Queries needed:** Pantry items by userId, aggregate score query, tier count query.


### 6.5 Wellness Check-ins

Daily 5-point emoji mood tracker. MVP: capture + display. Future: trend chart, correlation with diet changes.


### 6.6 Premium Paywall UPDATED

**Philosophy: depth gate, not access gate.** Free users experience real, personalized Clarvn — just at shallower volume and detail. Every premium gate fires after the user has already experienced partial value ("taste → desire → upgrade"). The paywall must never fire before the user has seen a personal score differ from the base score — the *score delta* is the aha moment that drives conversion.


#### Three-tier model

| Feature | Free | Premium | Family | Notes |
|---|---|---|---|---|

**Scanning & scoring**

| Barcode scan | ✓ | ✓ | ✓ | Unlimited. Scanning is the growth loop — never gated. |
| Product score + tier badge (A–F) | ✓ | ✓ | ✓ | Core free value. Always visible. |
| Ingredient flag count + basic list | ✓ | ✓ | ✓ | Always visible. |
| Match % on individually scanned products | ✓ | ✓ | ✓ | Always shown on product detail. Free users see the badge on scanned products — this is the aha moment seed. |
| Ingredient detail panel | Summary only | ✓ Full | ✓ Full | Free: plain-language description + function (2 lines). Premium adds safety assessment + profile-specific notes. Gate fires only when score delta ≥ 8 pts. |

**Discovery & explore**

| "For You" results on home | 3 results | ✓ Unlimited | ✓ Unlimited | Free sees 3 personalized results — enough to prove match % value, not enough to replace Premium. |
| Explore results | 6 results | ✓ Unlimited | ✓ Unlimited | Free: 6 results, generic sort. Premium: all results sorted by match %. Gate is inline overflow card — not a modal interrupt. |
| Advanced explore filters | — | ✓ | ✓ | Match % filter, allergen-free, price range, and others. Shown locked (dimmed pill) — never hidden. Free filters (Score A–F, Certifications) stay enabled. |
| Generic alternatives (score-ranked) | ✓ | ✓ | ✓ | Always free. |
| Personalized alternatives (match % ranked) | — | ✓ | ✓ | Premium unlocks alternatives sorted by user match %. |

**Pantry & tracking**

| Pantry (save products) | Up to 10 | ✓ Unlimited | ✓ Unlimited | Counter visible from save #1. Turns amber at 8/10 as early warning. Gate fires at attempt to save #11 — inline banner, not modal. |
| Pantry health score | — | ✓ | ✓ | Passive teaser card visible in pantry (locked, blurred). Small CTA — never competes with pantry contents. |
| Pantry health score trends | — | ✓ | ✓ | Phase 2 roadmap for trend chart. |
| Wellness check-ins | ✓ | ✓ | ✓ | Always free. Cheap to serve; builds daily habit and retention. |
| Check-in mood trends + diet correlation | — | ✓ Roadmap | ✓ Roadmap | Phase 2 feature. Reserved behind Premium from launch. |

**Tools**

| Product comparison (2–4 side-by-side) | — | ✓ | ✓ | Hard gate. Modal shows both product thumbnails + scores before the lock — partial value visible first. |
| Paste-ingredients analysis | 3/day | ✓ Unlimited | ✓ Unlimited | Free cap is enough to experience the feature. |
| Priority scoring queue | — | ✓ | ✓ | Premium scans jump the queue for unscored products. |

**Household & profiles (Family tier)**

| Single health profile | ✓ | ✓ | ✓ | All tiers. Built during onboarding before auth. |
| Multiple household profiles (up to 6) | — | — | ✓ | Family-only. Per-profile conditions, age ranges, match %. |
| Kids-specific scoring display | — | — | ✓ | Dyes, nitrates, added sugars by age range (Baby / Toddler / Child / Teen). |

> MVP scope: Free and Premium are live at launch. Family tier is displayed on pricing screens (to anchor $39 as the mid-option) but held back until per-profile conditions and shared pantry are built.


#### Pricing

| Plan | Price | Notes |
|---|---|---|
| **Free** | $0 / forever | No card required. Growth driver — must feel better than every competitor. |
| **Premium Annual** | $39 / year ($3.25/mo effective) | Primary conversion target. 14-day free trial, no credit card required. Auto-converts to annual at trial end. |
| **Premium Monthly** | $9.99 / month | Exists for users who won't commit annually. Price gap should feel large enough to push toward annual. |
| **Family Annual** | $69 / year ($5.75/mo effective) | Phase 2. Announce at launch to anchor pricing. Hold until multi-profile is fully built. |


#### Trial mechanics

The 14-day free trial starts at onboarding completion (account creation) — no credit card required. This ties the trial to the highest-intent moment. At day 12, an in-app nudge appears. At day 13, an email reminder. At day 14, the user gracefully reverts to Free tier — no hard lock, no data loss. The downgrade itself is a conversion moment ("You just lost X features"). `subscriptionStatus: "trialing"` is set on the user record during the trial period; `isPremium` is true during trial.


#### Six upgrade moment gates

**Precondition for gates 1, 2, 4:** the score delta (base score → personalized score) must be visible before the gate fires. A user who hasn't felt the product's value won't upgrade — they'll churn. If no score delta has been seen in the session, suppress personalization-dependent gates.

| # | Trigger | UX treatment | Copy formula | Precondition |
|---|---|---|---|---|
| **1** | User scrolls past result #6 in Explore or #3 in Home "For You" | Inline overflow card — no modal interrupt | "Showing 6 of N results. Premium shows all N sorted by your match % threshold." — count + total named + match % referenced. | Match % badges must be visible on the results already shown. |
| **2** | User taps Compare after selecting a second product | Full modal with partial preview — both product thumbnails + scores visible before the lock | "Compare [Product A] vs [Product B] — scores, match %, flagged ingredients, and certifications." — name both products and specific comparison dimensions. | Both thumbnails + base scores visible in modal before lock. Partial value makes upgrade feel concrete. |
| **3** | User taps a premium filter row in the filter panel | Inline lock pill on the row — no modal. Free filters remain fully functional. | "[Tapped filter] is Premium. Upgrade to filter by match %, allergen-free, price range, and N more." — name the tapped filter + 2 others + total count. | No prerequisite. Premium filter rows are visible but dimmed — never hidden. |
| **4** | User expands ingredient detail panel where personalized score delta ≥ 8 pts | Ingredient list + score delta visible above the lock. Profile notes section locked with overlay. | "[Ingredient] is flagged for your [Condition] profile. See exactly how this affects your score and what to watch for." — specific ingredient + specific condition. | **Score delta (base → your score) must be visible before the lock fires.** If delta < 8 pts, do not show this gate. |
| **5** | User attempts to save an 11th product to their pantry | Inline banner at bottom of pantry — not a modal. Counter visible from save #1; turns amber at 8/10. | "Your pantry is full (10/10). Premium gives you unlimited products and a live health score across everything you track." — show count, name both unlocks, include blurred health score card visual. | Counter must be visible before limit hits. Gate must never be a surprise. |
| **6** | User opens Pantry tab after saving their first product (passive, always visible) | Locked score card inline — no modal. Small teal text CTA, not a primary button. | "Unlock your pantry health score." CTA: "Start free trial" — secondary weight so it doesn't compete with the pantry list the user came to see. | No prerequisite. Always shows after first save. Must not block access to pantry contents. |


#### Guest user paywall behavior

Users who choose "Explore without an account" on the onboarding preview screen browse with a localStorage profile. They do **not** hit premium feature gates — instead, every gate is repurposed as a signup prompt: "Create a free account to save your profile and start your 14-day Premium trial." Converting them to registered free users is the priority at this stage, not pushing directly to payment. Once they create an account, the trial clock starts.


#### Stripe integration — three phases

| Phase | When | What | Schema fields |
|---|---|---|---|
| **Phase 0** — Manual MVP | Launch | No Stripe. `isPremium` boolean set manually by admin. `premiumUntil` timestamp controls expiry. Used for early access users, beta testers, and the founding cohort. | `isPremium` , `premiumUntil` |
| **Phase 1** — Checkout + Webhooks | Post-MVP · Priority | Stripe Checkout for Annual and Monthly plans. Webhook endpoint `POST /api/stripe/webhook` validates signature via `stripe.webhooks.constructEvent()` before calling `users.setPremiumStatus` mutation. Events handled: `checkout.session.completed` , `customer.subscription.updated` , `customer.subscription.deleted` , `invoice.payment_failed` . Race condition mitigation: show "Activating Premium…" state on return from Checkout, poll for status up to 10 seconds. | `stripeCustomerId` , `stripeSubscriptionId` , `subscriptionStatus` |
| **Phase 2** — Customer Portal | Phase 2 | Stripe Customer Portal for self-serve plan management: upgrade, downgrade, cancel, invoices. Add Family plan as a Stripe product. Future: RevenueCat layer for iOS/Android in-app purchases, mapping cleanly onto existing schema. | `planTier` |


#### 6.11 Admin — Complimentary Premium Management NEW

A dedicated page at `/admin/users` lets admins grant and revoke complimentary premium access without touching the Convex Dashboard. Backed by two internal mutations guarded by `requireAdmin(ctx)` .


##### Mutations

| Mutation | Args | Behaviour |
|---|---|---|
| `users.grantPremium` | `userId: string`   `durationDays: number | null` | Sets `isPremium: true` , `isComplimentary: true` , `grantedBy: adminUserId` , `subscriptionStatus: "active"` . If `durationDays` is provided, sets `premiumUntil: Date.now() + durationDays × 86_400_000` . If null (indefinite), sets `premiumUntil` to a far-future sentinel ( `9_999_999_999_999` ≈ year 2286). Expiry causes a silent downgrade — no modal shown to the user. |
| `users.revokePremium` | `userId: string` | Sets `isPremium: false` , `subscriptionStatus: "canceled"` , `premiumUntil: Date.now()` . Immediate effect — next gating check returns false. Only valid on `isComplimentary: true` accounts; mutation throws if called on a Stripe-paying subscriber (use Stripe Customer Portal to cancel paid subscriptions). |


##### Admin UI — /admin/users

New page in the existing admin panel, protected by the same `requireAdmin()` guard as all `/admin/*` routes.

- **Search:** text input queries `users` table by email (uses existing `by_email` index). Results show name, email, current status pill (Free / Trialing / Active / Complimentary / Expired), and `premiumUntil` date.
- **Grant form:** duration picker (30 days / 90 days / 1 year / Indefinite) + confirm button. Calls `users.grantPremium` . Status pill updates reactively.
- **Revoke button:** visible only on `isComplimentary: true` rows. Calls `users.revokePremium` . Disabled on Stripe-paying accounts with tooltip: "Cancel via Stripe Customer Portal."
- **Complimentary users list:** secondary table below search showing all users where `isComplimentary: true` , sorted by `premiumUntil` ascending — so expiring-soon accounts surface to the top.

> No new tables required. Everything runs off existing users table fields. The by_email index already exists from @convex-dev/auth. The only schema additions are isComplimentary and grantedBy on the users table.

Expandable explanation per ingredient: plain-language description, function in the product, safety assessment, profile-specific notes. `ingredientFunction` and `detailExplanation` fields generated during AI scoring — zero extra API calls.


### 6.8 Paste-Ingredients Analysis

User pastes raw ingredient list. AI parses it, creates temp product, runs pipeline, returns score. No product name needed.


### 6.9 Product Comparison

Side-by-side comparison of 2–4 products. Score, tier, ingredient count, flagged count, match %, claims grid. Premium-gated.


### 6.10 Onboarding Redesign NEW

Replaces the v3.1 freetext chat + Claude Haiku parsing flow with a 6-screen structured chip-select flow. **Runs before auth** so users experience personalization value before creating an account. Claude Haiku parsing action is removed — structured inputs write directly to the profile.


#### Flow: 6 screens + value preview

| Screen | Question | Input Type | Data Stored |
|---|---|---|---|
| **1 of 6** | "What brings you to Clarvn?" | Multi-select chips — 26 options covering broad health goals, symptoms, lifestyle drivers, and values (e.g., General health, Shopping for kids, Managing a condition, Avoiding additives, Weight management, Energy, Gut health, Clean eating, Curiosity, and more) | `motivation` (string[]) — stored but not used in scoring at MVP; reserved for future recommendation features |
| **2 of 6** | "Do any of these apply to you?" | Multi-select chips — 23 options including ADHD, Thyroid, Eczema, Hormone-sensitive cancer history, Diabetes Type 1, Diabetes Type 2, Heart condition, Pregnant, IBD/Crohn's, Autism, and more. "None of these" is exclusive. | `conditions` (string[]) — also captures primary-user pregnancy here (see `lifeStage` note in §4) |
| **3 of 6** | "Any sensitivities?" | Multi-select chips — 20 options. Major allergens broken out individually (Peanut, Tree nut, Shellfish, Egg). Also covers IBS/gut, Migraines, Lactose intolerance, Histamine sensitivity, Gluten sensitivity (non-celiac), FODMAP, Salicylate, Oxalate, Sulphite, and more. | `sensitivities` (string[]) — symptom-driven, not diagnosis-driven. Distinct from conditions. |
| **4 of 6** | "Any dietary restrictions?" | Multi-select chips: Gluten-free, Dairy-free, Vegan, Vegetarian, Nut-free, Soy-free, Low sodium, Kosher, Halal. "No restrictions" is exclusive. | `dietaryRestrictions` (string[]) — these are **hard filters** , not score modifiers. Non-compliant products are excluded from recommendations entirely. |
| **5 of 6** | "Who are you shopping for?" | Toggle: "Just me" / "My household." If household → inline member picker. Member chips: Partner, Baby (0–1), Toddler (1–3), Child (3–12), Teen (13–17), Pregnant. Multiple members of the same role allowed. | `lifeStage` ("just_me" | "household"), `householdMembers` ({role, ageRange?}[]). No per-member conditions at MVP — conditions apply to primary user only. |
| **6 of 6** | "Any specific ingredients to flag?" + Skip button | Multi-select chips — 14 options: Red 40, Yellow 5, Yellow 6, Blue 1, BHT, BHA, TBHQ, HFCS, Sodium nitrite, Carrageenan, Titanium dioxide, Artificial flavors, MSG, Aspartame | `ingredientsToAvoid` (string[]). **Skip writes `[]` (empty array), not `null`** — the data layer must distinguish "explicitly skipped" from "not yet answered." |
| **Preview** | "Your profile: N active flags" — flags grouped by category (up to 4 pills per section + "+N more"). Personalisation callout: "We'll personalise scores for X, Y, and N more." | No input. Display only. Progress bar hidden. | Primary CTA: "Create your free account to save your profile" → auth gate. Secondary action: **"Explore without an account"** — continues with localStorage profile, no server persistence. |

**Progress indicator:** Progress bar showing "Step X of 6" at the top of each screen. The value preview screen is not counted in the bar.


#### Pre-auth data flow

During onboarding, the profile is built incrementally in **localStorage** under the key `clarvn_onboarding_profile` (no Convex writes — the user isn't authenticated yet). On the value preview screen, the primary CTA takes the user to the auth gate; the secondary action ("Explore without an account") allows continued browsing with the localStorage profile but without server persistence. After successful signup, a mutation writes the localStorage profile to `user_profiles` in Convex, keyed by the new userId, and the localStorage key is cleared.

**Partial onboarding:** If a user closes the browser mid-flow, localStorage preserves progress. Whether to resume from the last completed screen or restart is an open question for implementation — see §10 open risks. Screen state (current step) must be stored alongside the profile object in localStorage to enable resumption.

**Returning users:** The preview screen CTA currently only offers "Create free account." A sign-in alternative is needed for users who complete onboarding on a new device or after clearing their browser. This is an open UX question flagged in the design doc.

> Architectural impact: The Claude Haiku onboarding.parseAndSaveProfile action from v3.1 is retired. No AI parsing needed — structured chip inputs map directly to profile fields. This eliminates the onboarding dependency on the Anthropic API and removes a source of parsing unpredictability.


---

### Section 07 · Updated

## Consumer App Routes

| Route | Description | Status |
|---|---|---|
| `/` | Landing / marketing page | Exists — needs redesign |
| `/login` | Auth gate | Exists |
| `/onboarding` REDESIGNED | 6-screen structured chip flow. Runs before auth. Progress bar. Ends with value preview → auth gate. | Exists — full redesign |
| `/home` NEW | Personalized dashboard — hero search, quick actions, match recommendations, sidebar widgets | New |
| `/explore` NEW | Category browsing with faceted filters and paginated results | New — replaces `/app` |
| `/product/[id]` NEW | Full product detail with score card, claims, ingredients, alternatives | New — replaces modal |
| `/pantry` NEW | Saved product collection with aggregate health score | New |
| `/compare` NEW | Side-by-side product comparison (premium) | New |
| `/admin/*` | Admin routes (unchanged) | Exists |
| `/admin/users` NEW | Complimentary premium management — search users by email, grant/revoke premium access, view all active complimentary accounts | New |


---

### Section 08 · Updated

## Security & Access Control

- All v3.1 security patterns retained.
- NEW **Premium gating:** Gated queries check `isPremium` on user record. Free-tier result caps enforced server-side.
- NEW **Pantry/check-in data:** Filtered by userId server-side. Users see only their own data.
- NEW **Complimentary premium mutations:** `users.grantPremium` and `users.revokePremium` are `internalMutation` s called only via `requireAdmin(ctx)` . `revokePremium` throws if called on a non-complimentary account — Stripe-paying subscribers must be cancelled via Stripe, not this path. `grantedBy` field records the admin userId for every grant as an audit trail.
- NEW **Pre-auth onboarding data:** Profile stored in localStorage key `clarvn_onboarding_profile` until signup completes. No server writes before auth. On signup, localStorage profile is written to Convex and the key is cleared. If the user abandons before signup (including via "Explore without an account"), no data is stored server-side. `ingredientsToAvoid: []` (empty array) means explicitly skipped on Screen 6; absent/null means the screen was not yet reached — this distinction must be preserved on write.


---

### Section 09 · Updated

## Key Decisions — v3.4 Additions

| Decision | Rationale |
|---|---|
| **Claims as separate table** | Enables faceted filtering without full-table scan. Many-to-many: one product → many claims. |
| **Match % at query time** | Profiles change often. Pre-computing would require re-indexing all products on every edit. Query-time is fast enough (< 50ms). |
| **Pantry score as aggregate query** | Average of pantry products. Computed on read — stays fresh as scores update. |
| **Premium flag (manual MVP)** | Simple boolean + expiry. Stripe webhook flips it post-MVP. No complex state machine. |
| **Claims from OFF + AI** | OFF provides certifications directly. AI fills gaps. Verified vs. inferred distinction stored. |
| **Ingredient function from scoring prompt** | Added to existing prompt — zero extra API calls. One-time generation stored alongside scores. |
| **Onboarding before auth** | Users experience personalization value before committing to an account. Reduces signup friction. Profile stored in localStorage until auth completes — no server writes before signup. |
| **Structured chips over freetext** | Eliminates AI parsing dependency (removes Haiku action). Predictable profile data. Faster onboarding. No misinterpretation risk. Chip options are curated from the most common user needs. |
| **Household members on profile** | Shopping-for-household is a core Persona B use case (kids, partner). Household flags feed into match % — child-specific age ranges apply stricter ingredient flags (dyes, nitrates, added sugars). Teen (13–17) added as a distinct range. "Partner with conditions" simplified to plain "Partner" — the partner's own conditions can be added post-onboarding. Per-member conditions dropped from MVP scope to reduce signup friction; the scoring benefit is marginal at this stage. |
| **lifeStage = "just_me" | "household"** | v3.2 defined `lifeStage` as "pregnant" | "nursing" | null (primary user's own stage). The onboarding design doc repurposed it to represent the Screen 5 shopping context. Resolution: `lifeStage` now means "just_me" | "household". Primary-user pregnancy and nursing are captured via `conditions[]` , where they already appear as Screen 2 chip options. Any v3.2 data with "pregnant"/"nursing" in `lifeStage` should be backfilled to `conditions` . |
| **ingredientsToAvoid: [] vs null** | Skip on Screen 6 writes an empty array, not null or absent. This allows the data layer to distinguish "user explicitly skipped this screen" from "user never reached this screen." The distinction matters for analytics and for deciding whether to prompt re-engagement. |
| **Depth gate, not access gate** | Free users experience real personalized Clarvn at shallower depth — not a walled product. The free tier must feel meaningfully better than any competitor so users hit the paywall already convinced. Gating all personalization behind Premium creates a bait-and-switch after onboarding; the resolution is "free tier gets personalization taste, Premium gets personalization depth." |
| **Trial at account creation, no CC required** | 14-day free trial starts automatically when the user creates an account after completing onboarding — the highest-intent moment. No credit card required. Starting the trial at the first gate hit instead would extend the "free" window but delay the conversion clock; the onboarding completion moment is the correct trigger. |
| **Score delta precondition for gates 1, 2, 4** | Personalization-dependent upgrade gates fire only after the user has seen a personalized score differ from the base score (the "aha moment"). Showing a paywall before this value proof lands converts nobody and creates churn. Server-side: track whether the user has been shown a score delta ≥ 1 point in the current session before enabling these gates. |
| **Guest user gates as signup prompts** | "Explore without an account" users browse with a localStorage profile. They don't hit premium feature gates — instead every gate shows "Create a free account to save your profile and start your 14-day Premium trial." Converting them to registered free users is the priority at this funnel stage, not direct payment. |
| **subscriptionStatus granularity** | The users table tracks four status strings ("active", "trialing", "canceled", "past_due") rather than just `isPremium` boolean. This enables contextual UI states — "past_due" shows a payment banner without hard-locking features; "trialing" shows a trial-days-remaining nudge. Relying on boolean alone would force a binary lock/unlock decision that degrades UX for users with payment issues. |
| **Family tier announced at launch, held for Phase 2** | Showing all three tiers at launch anchors the $39 Premium price as the mid-option (not the most expensive). Family tier features (multi-profile conditions, shared pantry) require significant additional build. Announcing without opening avoids scope creep while capturing the pricing anchor effect. |
| **isComplimentary flag separate from isPremium** | Complimentary accounts need the same gating behaviour as paid accounts, so `isPremium` + `premiumUntil` handle access control unchanged. The separate `isComplimentary` flag exists purely for reporting and UI differentiation — so the admin panel can surface expiring complimentary accounts, the Revoke button only appears on complimentary rows, and future analytics can cleanly separate revenue from non-revenue premium users. |
| **Silent downgrade on complimentary expiry** | When `premiumUntil` lapses on a manually-granted account, the user silently reverts to free — no modal, no email. This matches the design intent: complimentary grants are operational tools (beta testers, press, founding cohort), not subscription products. A conversion moment modal would be confusing for users who never expected to pay. |
| **revokePremium throws on Stripe accounts** | Allowing admins to revoke a paying subscriber's access via the admin panel would bypass Stripe's subscription lifecycle, causing billing/access desync. The mutation explicitly rejects non-complimentary accounts and surfaces a tooltip directing the admin to Stripe Customer Portal instead. |


---

### Section 10 · Updated

## Risks — v3.4 Additions

| Risk | Impact | Mitigation |
|---|---|---|
| **Product data gaps (price, image, rating)** | Many products missing enrichment at launch. | Graceful degradation — emoji placeholders, "—" for missing data. Enrich over time. |
| **Match % with sparse claims** | Misleading if no claims data exists. | Show "Not enough data" instead of 0%. Only compute for products with claims. |
| **Free tier too restrictive** | Kills growth and word-of-mouth. | All product details + scores stay free. Only discovery/exploration is gated. Tune limits post-launch. |
| **Scope creep from UI features** | Delays pipeline hardening. | Delivery plan phases UI after pipeline stability. MVP each feature. |
| **Partial onboarding resumption** | Users who close mid-flow and return may get a jarring restart. | Store current step index in localStorage alongside the profile object. On re-open, resume from the last completed screen. Requires implementation decision before build. |
| **Returning user re-onboarding** | Preview CTA only offers "Create free account." Returning users on a new device have no sign-in path. | Add "Sign in to save" alongside the primary CTA on the preview screen. Flag for UX resolution before build. |
| **Skip ambiguity in analytics** | If `ingredientsToAvoid` is written as null instead of `[]` , "skipped" and "not reached" become indistinguishable in the data. | Enforce empty-array write on Skip in the frontend. Server-side mutation should reject null for this field post-auth. |
| **lifeStage migration (v3.2 → v3.4)** | Any user records with `lifeStage: "pregnant"` or `"nursing"` from v3.2 will be invalid after the field redefinition. | Run a one-time Convex migration: move "pregnant"/"nursing" lifeStage values into the `conditions` array; set `lifeStage` to "just_me" as default. Low risk — feature is pre-launch. |
| **Free tier feels generic after personalized onboarding** | Users complete 6 screens of personalization, see a compelling preview — then sign up and hit a 6-result, unfiltered explore. High churn risk. | Home screen must always lead with at least 3 personalized "For You" results. Match % badge must be visible on scanned products from first use. Score delta must appear before any upgrade gate fires. |
| **14-day trial ends without reminder conversion** | Users who start a trial and don't add a CC will silently revert to free without knowing. | In-app nudge at day 12, email at day 13, graceful downgrade at day 14 (no data loss). Downgrade screen itself is a conversion moment — "You just lost X features." |
| **Pantry limit too aggressive at 10** | Persona B shoppers may save 20+ products before hitting the limit. Firing too early feels punitive before sufficient value has been experienced. | 10 is a starting point, not a hard commitment. Show counter from save #1; amber at 8/10. Architecture allows changing this with a single server-side constant. Tune post-launch. |
| **Stripe webhook race condition on signup** | User subscribes and immediately opens the app before webhook fires — `isPremium` still false, user sees free tier. | Show "Activating your Premium…" loading state on return from Stripe Checkout. Poll `subscriptionStatus` for up to 10 seconds before showing the free tier. |


---

*Clarvn · Architecture Document v3.4 · March 2026 · Confidential — for partner review only*
