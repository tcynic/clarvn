# Clarvn — UI Redesign Delivery Plan

> Delivery Plan · UI Redesign · March 2026 · Confidential

## Clarvn — UI Redesign Delivery Plan

SkinSort-inspired redesign: new design system, pantry, profile match scoring, category browsing, product claims, wellness check-ins, three-tier premium paywall (Free/Premium/Family), 14-day trial mechanics, six upgrade-moment gates, enriched product data, and paste-ingredient analysis. Updated from v3.1 baseline to Clarvn v3.4 architecture.

> ✅ Already built (v3.1): Convex backend, ingredient-first pipeline, auth, admin UI (ingredient queue, product browser, batch scoring), consumer app (onboarding, product search, scoring, detail, alternatives, shopping list), deployment. This plan builds the UI redesign on top of that foundation, updated to the Clarvn v3.4 architecture (expanded onboarding chip sets, resolved household schema, three-tier paywall, trial mechanics, six upgrade gates).


---

### Section 01

## Sprint Plan Overview

**E1:** Schema + Design System

**E2:** Product Data Enrichment

✓ New tables. New palette. Products enriched. Admin user management.

◈ R1: Schema + enrichment regression

**E3:** Onboarding Redesign

**E4:** Home Dashboard

✓ Onboarding + home dashboard live.

◈ R2: Full suite + onboarding critical path

**E5:** Pantry + Check-ins

**E6:** Explore + Filters

✓ Pantry + explore live.

◈ R3: Full suite + end-to-end save path

**E7:** Product Detail Redesign

**E8:** Premium + Advanced Features

✓ Product detail. Paywall. Trial. Six gates.

◈ R4: Full suite + all gates + expired trial path

**E9:** Polish + Validation

Final pre-launch regression on production. Persona B interviews. Post-launch backlog.


---

### Section 02

## Epics, User Stories & Tasks

Points: 1 = half day, 2 = one day, 3 = two days. All tasks junior-dev scoped. Yellow = epic test stories (one per epic, verify the work just done). Purple = sprint regression stories (one per sprint, verify nothing from prior sprints has broken — next sprint does not start until green).

> Branch naming convention: All work must be done on a Git branch prefixed feature-. Create a new feature-* branch per epic (e.g. feature-schema-migration, feature-onboarding-redesign, feature-paywall). No direct commits to main. Regression stories are run against the merged state on a feature-regression-sprintN branch before the next sprint's feature branches are cut.

| ID | User Story | Pts | Tasks |
|---|---|---|---|

**EPIC 1 — Schema Migration + Design System (Sprint 1, Days 1–5)** ✅ COMPLETE

| 1.1 | New tables and fields added to `convex/schema.ts` . | 3 | Add `pantry_items` table: userId, productId, addedAt. Indexes: by_userId, by_userId_productId; Add `daily_checkins` table: userId, date, mood, notes. Index: by_userId_date; Add `product_claims` table: productId, claim, verified, source. Index: by_productId; Add `content_articles` table: title, category, emoji, slug, body, publishedAt; Add fields to `products` : category, subcategory, price, imageUrl, averageRating, reviewCount, retailers, size, description. New indexes: by_category, by_tier; Add fields to `ingredients` : ingredientFunction, detailExplanation; Add fields to `users` (Phase 0): `isPremium` (v.boolean), `premiumUntil` (v.optional(v.number())) — expiry timestamp; isPremium checks must also validate premiumUntil > Date.now() server-side; Add fields to `users` (Phase 1 placeholders — optional, null at launch): `stripeCustomerId` , `stripeSubscriptionId` , `subscriptionStatus` ("active" | "trialing" | "canceled" | "past_due"); Add field to `users` (Phase 2 placeholder): `planTier` ("premium" | "family") — null at launch; Run `npx convex dev` — verify all tables push cleanly; **Tool:** Convex CLI · Dashboard |
| 1.2 | New design system (teal/gray/white palette) replaces earthy green/cream. | 3 | Update TailwindCSS config with new color tokens from SkinSort prototype: teal primary (#0BA888), cool grays, white surfaces; Build core UI primitives: NavBar (logo, search, nav links, avatar, premium button), Widget card, ProductCard, ScorePill (gradient by tier), MatchBadge, FilterPill; Update typography: keep DM Serif Display + DM Sans but adjust weights and spacing per prototype; Build responsive breakpoints: desktop (2-col with sidebar), tablet (single col), mobile (tab switcher); Create Storybook or component showcase page to verify all primitives render correctly; **Tool:** Claude Code for component building · Tailwind config |
| 1.3 | Core Convex queries and mutations for new features. | 3 | Write pantry mutations: `addToPantry(productId)` , `removeFromPantry(productId)`; Write pantry queries: `getMyPantry()` , `getPantryStats()` (count, clean count, avg score); Write check-in mutations: `logCheckin(mood, notes?)` (upsert on today's date); Write check-in query: `getTodayCheckin()`; Write profile match query: `getMatchPercentage(productId)` — joins user flags against claims + ingredient scores; Write product browse query: `browseProducts(category?, tier?, claims?, sort?, cursor?)` with pagination; Write claims queries: `getProductClaims(productId)`; Write premium check helpers: `requirePremium(ctx)` and `isPremiumUser(ctx)` — must validate **both** `isPremium === true` AND `premiumUntil > Date.now()` server-side; never rely on boolean alone; Write subscription status query: `getSubscriptionStatus()` — returns `{isPremium, subscriptionStatus, premiumUntil, daysRemaining}` for UI states (trial countdown, past_due banner) |
| 1.5 | Build admin complimentary premium management ( `/admin/users` ). | 2 | Add `isComplimentary: v.optional(v.boolean())` and `grantedBy: v.optional(v.string())` to `users` table in `convex/schema.ts`; Write `users.grantPremium(userId, durationDays)` internalMutation: sets `isPremium: true` , `isComplimentary: true` , `grantedBy` , `subscriptionStatus: "active"` , and `premiumUntil` (far-future sentinel `9_999_999_999_999` if `durationDays` is null, else `Date.now() + durationDays × 86_400_000` ). Guarded by `requireAdmin(ctx)` .; Write `users.revokePremium(userId)` internalMutation: sets `isPremium: false` , `subscriptionStatus: "canceled"` , `premiumUntil: Date.now()` . Throws if `isComplimentary !== true` — Stripe-paying accounts must be cancelled via Stripe, not this path.; Write `users.searchByEmail(email)` query using existing `by_email` index — returns name, email, isPremium, isComplimentary, subscriptionStatus, premiumUntil, grantedBy; Write `users.listComplimentary()` query — returns all `isComplimentary: true` users sorted by `premiumUntil` ascending (expiring soonest first); Build `/admin/users` page: email search input → result row with status pill (Free / Trialing / Active / Complimentary / Expired) + premiumUntil date; Grant form: duration picker (30 days / 90 days / 1 year / Indefinite) + confirm button. Calls `users.grantPremium` . Status pill updates reactively via Convex `useQuery` .; Revoke button: visible only on Complimentary rows. Disabled on Stripe-paying rows with tooltip "Cancel via Stripe Customer Portal."; Complimentary users list: secondary table below search showing all active complimentary accounts, sorted by premiumUntil ascending; **Branch:** `feature-admin-user-management` · **Tool:** Convex CLI · Claude Code |
| 1.4 | ✅ TESTING: Schema, design system, new queries, and admin user management. | 2 | Unit test: addToPantry creates entry, second call is idempotent (no duplicate); Unit test: getPantryStats returns correct counts and average score; Unit test: logCheckin creates entry, second call on same day updates (upsert); Unit test: getMatchPercentage returns 100% for product matching all user flags; Unit test: getMatchPercentage returns correct % for partial match; Unit test: browseProducts respects category filter and pagination; Unit test: `grantPremium` sets all five fields correctly (isPremium, isComplimentary, grantedBy, subscriptionStatus, premiumUntil); Unit test: `grantPremium` with durationDays=30 sets premiumUntil ≈ now + 30 days (±5 seconds); Unit test: `grantPremium` with durationDays=null sets premiumUntil to sentinel value; Unit test: `revokePremium` sets isPremium=false and premiumUntil=now on a complimentary account; Unit test: `revokePremium` throws when called on a non-complimentary account; E2E: navigate to /admin/users, search by email, verify result row shows correct status pill; E2E: grant 30-day premium → verify status pill changes to Complimentary and user appears in complimentary list; E2E: revoke → verify status pill reverts to Free immediately; Visual check: all new UI primitives render in component showcase; **Tool:** Vitest · Playwright MCP · Browser dev tools |

**EPIC 2 — Product Data Enrichment (Sprint 1, Days 5–10)** ✅ COMPLETE

| 2.1 | ✅ Enrich existing products with categories, images, claims, and metadata from Open Food Facts. | 3 | Write Convex action `enrichProductFromOFF(productId)` that fetches category, image_url, labels (certifications), nutriments from OFF API; Map OFF `categories_tags` to Clarvn categories (pantry_staples, snacks, dairy, etc.); Parse OFF `labels_tags` into product_claims (en:organic → usda_organic, en:gluten-free → gluten_free, etc.); Store image URL, category, subcategory on products table; Write CLI script to batch-enrich all ~500 existing products; **Tool:** Open Food Facts API · ConvexHttpClient |
| 2.2 | ✅ AI-generate ingredient functions and detail explanations for existing scored ingredients. | 3 | Update the ingredient scoring prompt to also return `ingredientFunction` and `detailExplanation`; Write a backfill CLI script that calls Claude for each existing scored ingredient (only the function/explanation fields — not a full rescore); Prompt: "For [ingredient], classify its function in food products (one of: Preservative, Emulsifier, Colorant, Sweetener, etc.) and write a 2-sentence plain-language explanation of what it is and whether it's safe."; Write results to ingredientFunction and detailExplanation fields via mutation; **Tool:** Anthropic SDK · ConvexHttpClient |
| 2.3 | ✅ AI-extract claims for products not covered by OFF data. | 2 | Write Convex action `extractClaims(productId)` that calls Claude Sonnet 4.6: "Given the product [name] by [brand] with these ingredients [...], what certifications and claims does it likely have?"; Store results in product_claims with verified=false, source="ai_extraction"; Run for products with 0 claims after OFF enrichment |
| 2.4 | ✅ TESTING: Enrichment pipeline. | 2 | Unit test: enrichProductFromOFF correctly maps OFF categories and labels to Clarvn schema; Spot-check 20 products: verify category, image, and claims are populated and correct; Verify ingredient function and explanation are populated for top 50 ingredients; Verify AI-extracted claims are flagged as verified=false; **Tool:** Vitest · Convex Dashboard |

**◈ SPRINT 1 REGRESSION — End of Weeks 1–2 (before Sprint 2 begins)** ✅ COMPLETE

| R1 | ✅ Sprint 1 regression: schema, design system, enrichment pipeline. | 2 | Run full Vitest suite — all unit tests from 1.4 and 2.4 must pass green; E2E smoke: deploy to Vercel preview. Navigate /home, /explore, /onboarding — no broken routes; Convex Dashboard: verify all 4 new tables exist with correct indexes. Spot-check 5 products for populated category, image, claims; Visual regression: load component showcase — verify all primitives (NavBar, ProductCard, ScorePill, MatchBadge, FilterPill) render at 375px, 768px, and 1180px; Confirm `isPremium` , `premiumUntil` , `isComplimentary` , `grantedBy` , `subscriptionStatus` , `planTier` fields exist on users table with correct types; E2E: navigate to /admin/users, verify page loads and email search returns results; ✋ **Sprint 2 does not begin until this regression is green.**; **Tool:** Vitest · Playwright MCP · Convex Dashboard |

**EPIC 3 — Onboarding Redesign (Sprint 2, Days 1–4)**

| 3.1 | Build 6-screen onboarding flow with multi-select chips. | 3 | Build screen 1 — Motivation: "What brings you to Clarvn?" Multi-select chips — **26 options** covering broad health goals, symptoms, lifestyle drivers, and values (e.g., General health, Shopping for kids, Managing a condition, Avoiding additives, Weight management, Energy, Gut health, Clean eating, Reducing sugar, Avoiding dyes, Environmental concerns, Curiosity, and more). Store in localStorage as `motivation[]`; Build screen 2 — Conditions: "Do any of these apply?" **23 options** including ADHD, Thyroid, Eczema, Hormone-sensitive cancer history, Diabetes Type 1, Diabetes Type 2, Heart condition, Pregnant, IBD/Crohn's, Autism, and others. "None of these" is an exclusive chip (clears all others when selected). Store as `conditions[]`; Build screen 3 — Sensitivities: "Any sensitivities?" **20 options** . Major allergens broken out individually: Peanut, Tree nut, Shellfish, Egg. Also includes IBS/gut, Migraines, Lactose intolerance, Histamine sensitivity, Gluten sensitivity (non-celiac), FODMAP, Salicylate, Oxalate, Sulphite, and others. Store as `sensitivities[]`; Build screen 4 — Dietary Restrictions: "Any dietary restrictions?" Chips (Gluten-free, Dairy-free, Vegan, Vegetarian, Nut-free, Soy-free, Low sodium, Kosher, Halal, None). Store as `dietaryRestrictions[]`; Build progress bar component: "Step X of 6" displayed at top of each screen; Build shared chip-select component: renders array of options, toggles selected state, supports "None" as deselect-all |
| 3.2 | Build household members screen (screen 5). | 3 | Build toggle: "Just me" vs. "My household." Store `lifeStage` as "just_me" | "household" (not pregnancy — primary-user pregnancy is captured in `conditions[]` on Screen 2); If household → show inline "Add member" chip grid with roles: Partner, Baby (0–1), Toddler (1–3), Child (3–12), Teen (13–17), Pregnant. Selecting a chip adds the member and closes the picker.; Store as `householdMembers[]` with shape `{role: string, ageRange?: string}` — no per-member conditions at MVP (removed to reduce signup friction); Allow multiple members of the same role (e.g., two children at different age ranges). Scoring pipeline uses the most restrictive applicable member profile for ingredient flags.; Display added members as removable pills below the picker |
| 3.3 | Build optional ingredients-to-avoid screen (screen 6) + value preview. | 2 | Build screen 6: "Any specific ingredients to flag?" Chips: Red 40, Yellow 5, Yellow 6, Blue 1, BHT, BHA, TBHQ, HFCS, Sodium nitrite, Carrageenan, Titanium dioxide, Artificial flavors, MSG, Aspartame. Prominent "Skip" button — **Skip must write `[]` (empty array) to `ingredientsToAvoid` , not null or absent** . This distinguishes "explicitly skipped" from "not yet answered" for analytics.; Store as `ingredientsToAvoid[]`; Build value preview screen (not counted in progress bar): "Your profile: N active flags" + category-grouped pills (up to 4 per section + "+N more" overflow) + personalisation callout ("We'll personalise scores for [specific flag] and N more"). Progress bar hidden on preview screen.; Primary CTA: "Create your free account to save your profile" → navigates to auth gate; Secondary action: **"Explore without an account"** — continues with localStorage profile intact, no Convex write, no auth. Handles the guest browsing path (see story 3.4). |
| 3.4 | Wire pre-auth localStorage → post-auth Convex migration and guest user path. | 2 | All 6 screens write incrementally to localStorage key: `clarvn_onboarding_profile`; Also persist current step index to localStorage ( `clarvn_onboarding_step` ) so partial progress can be resumed on re-open; **Auth path:** after signup completes, write mutation `createProfileFromOnboarding(profileData)` that reads the full profile from the client and writes to `user_profiles` with the new userId. Clear both localStorage keys after successful Convex write.; **Guest path ("Explore without an account"):** user lands on /home or /explore with localStorage profile active. All personalization (match %, ingredient flags) is applied client-side from localStorage. Premium gates show a signup prompt: "Create a free account to save your profile and start your 14-day Premium trial" — not a hard paywall.; On subsequent app loads: if user is authed but has no user_profiles record, redirect to /onboarding. If user is not authed and has a localStorage profile, show "Welcome back — sign up to save your profile" on the auth screen.; Remove the v3.1 `onboarding.parseAndSaveProfile` Haiku action — no longer needed |
| 3.5 | ✅ TESTING: Onboarding flow. | 2 | E2E: complete all 6 screens → verify localStorage contains full profile with all fields; E2E: skip screen 6 → verify `ingredientsToAvoid` is empty array `[]` (not null, not absent); E2E: add household members (baby + teen) → verify `householdMembers` array is `[{role:"baby",ageRange:"0-1"},{role:"teen",ageRange:"13-17"}]` with no conditions field; E2E: verify "Partner with conditions" chip no longer exists — plain "Partner" chip present instead; E2E: value preview shows correct flag count matching selections; progress bar is hidden on preview screen; E2E: complete onboarding → choose "Explore without an account" → verify localStorage profile persists, user lands on /home, no Convex write occurs; E2E: complete onboarding → sign up → verify profile written to Convex user_profiles table and localStorage keys cleared; E2E: close browser mid-onboarding (step 3), reopen → verify step index restored and onboarding resumes at screen 3; **Tool:** Playwright MCP · Convex Dashboard |

**EPIC 4 — Home Dashboard (Sprint 2, Days 4–10)**

| 4.1 | Build the home dashboard route ( `/home` ). | 3 | Build hero section: welcome message (user's name), title "Find food that *works* for you", subtitle, hero search card; Build search card: text input + search button + search chips (Scan barcode, Image, Find safer alternatives, Filters); Build quick actions grid: 4 cards (Analyze ingredients, Compare products, Find safer swaps, Pantry health score); Wire hero search to navigate to /explore with query param |
| 4.2 | Build "Products that match you" section with profile-based recommendations. | 3 | Use `browseProducts` query sorted by match % descending (top 3 for free, more for premium); Build ProductCard component: image, match badge (% match), save button (heart), brand, name, price, rating; Build locked card: "Unlock X more matches" → triggers premium upsell; Section header: "Products that match you" + subtitle "Curated for your [profile summary]" + "See all →" link |
| 4.3 | Build sidebar widgets: check-in, pantry stats, health profile summary. | 3 | Build check-in widget: "How are you feeling today?" + 5 emoji buttons (rough → great) → calls logCheckin mutation; Build pantry widget: products tracked count, clean-rated count, pantry health score (average) + "View all →" link; Build profile widget: display user's conditions/sensitivities as tags + "Edit" link + "+ Add more" link; Wire data: useQuery for getPantryStats, getTodayCheckin, getMyProfile |
| 4.4 | Build educational content section. | 1 | "Get smart about food labels" section with 2 content cards (deep dive + watch list); Query content_articles table. Seed 4–6 initial articles via admin; Cards: gradient header with emoji, category label, title text |
| 4.5 | ✅ TESTING: Home dashboard. | 2 | E2E: navigate to /home, verify welcome message shows user's name; E2E: verify "Products that match you" shows 3 cards sorted by match %; E2E: click check-in emoji, verify it saves (check Dashboard for daily_checkins entry); E2E: verify pantry stats widget shows correct counts; E2E: hero search input navigates to /explore with query; **Tool:** Playwright MCP · Convex Dashboard |

**◈ SPRINT 2 REGRESSION — End of Weeks 3–4 (before Sprint 3 begins)**

| R2 | Sprint 2 regression: onboarding + home dashboard, plus Sprint 1 carry-forward. | 2 | Re-run full Vitest suite — all unit tests from Sprints 1 and 2 must pass green; E2E critical path: complete onboarding → sign up → land on /home → verify profile-based recommendations load; E2E regression: Sprint 1 routes (/explore product cards, component primitives) still render correctly — no design system regressions from onboarding changes; E2E: onboarding guest path → "Explore without an account" → verify /home loads with localStorage profile, no auth redirect; E2E: verify Convex `user_profiles` record is written correctly after signup (check all fields: motivation, conditions, sensitivities, dietaryRestrictions, lifeStage, householdMembers, ingredientsToAvoid); E2E: mid-onboarding browser close → reopen → confirm step-index resumption still works after home dashboard code was added; ✋ **Sprint 3 does not begin until this regression is green.**; **Tool:** Vitest · Playwright MCP · Convex Dashboard |

**EPIC 5 — Pantry + Check-ins (Sprint 3, continued)**

| 5.1 | Build the pantry page ( `/pantry` ). | 3 | Full pantry view: grid of saved product cards with scores and tier badges; Pantry health score banner at top (average of all product base scores); Stats row: total products, clean count, watch count, caution count, avoid count; Sort options: by score, by name, by date added; Remove from pantry action (swipe or button); "Add to pantry" button on product detail page calls addToPantry mutation |
| 5.2 | Wire "Add to pantry" and "Save" buttons across the app. | 2 | Product detail: "Add to pantry" button (below alternatives). Toggle state: "Added ✓" when already in pantry; Product cards: heart/save button toggles pantry membership; Check pantry membership reactively (useQuery to check if productId is in user's pantry) |
| 5.3 | ✅ TESTING: Pantry and check-ins. | 2 | E2E: add product to pantry from product detail → verify it appears on /pantry; E2E: verify pantry health score updates when a product is added/removed; E2E: verify check-in persists across page refreshes (query returns today's mood); Unit test: pantry stats correctly count products by tier; **Tool:** Vitest · Playwright MCP |

**EPIC 6 — Explore + Filters (Sprint 3, Weeks 5–6)**

| 6.1 | Build the explore page ( `/explore` ) with category filters. | 3 | Build explore header: title "Best Clean Food Products" + category pill row (All, Pantry staples, Snacks, Dairy, Condiments, Baby & Kids, Beverages, Frozen); Clicking a pill filters products by category via browseProducts query; Results count: "Showing X products matching your profile"; Sort dropdown: Best match, Highest score, Most reviewed, Price low→high; Paginated results grid with product cards (match badge, save, brand, name, desc, price, rating) |
| 6.2 | Build faceted sidebar filters. | 3 | Build sidebar filter groups: Free-from (checkboxes: Gluten-free, Dairy-free, Nut-free, Soy-free, Artificial dyes, Added sugars, Preservatives), Certifications (USDA Organic, Non-GMO, Kosher, Vegan), Score range (Clean, Watch, Caution), Price range (Under $5, $5–15, Over $15); Each filter option shows count of matching products; Filters modify the browseProducts query parameters. Multiple filters combine with AND logic; Claims-based filters query product_claims table: e.g., free-from "Gluten-free" checks for claim="gluten_free"; Responsive: sidebar hidden on mobile, replaced by filter sheet |
| 6.3 | Build the locked-results paywall card. | 1 | After 6 results, show a locked card: "Unlock X more results" with lock icon; Free-tier browseProducts query caps at 6 results server-side (isPremium check); Clicking locked card opens premium upsell modal/page |
| 6.4 | ✅ TESTING: Explore page. | 2 | E2E: navigate to /explore, verify products load with match badges; E2E: click "Snacks" pill → verify only snack products shown; E2E: check "Gluten-free" filter → verify result count decreases and all results have gluten_free claim; E2E: free user sees locked card after 6 results; premium user sees all; Unit test: browseProducts with category="snacks" + claim="gluten_free" returns correct subset; **Tool:** Playwright MCP · Vitest |

**◈ SPRINT 3 REGRESSION — End of Weeks 5–6 (before Sprint 4 begins)**

| R3 | Sprint 3 regression: pantry, check-ins, explore, plus Sprints 1–2 carry-forward. | 2 | Re-run full Vitest suite — all unit tests from Sprints 1–3 must pass green; E2E critical path: sign up → complete onboarding → /home → save a product → /pantry → verify health score displays. This end-to-end path exercises every sprint so far.; E2E regression: /explore category filter and 6-result free cap still work correctly after pantry save-button changes; E2E regression: check-in widget on /home still saves correctly (not broken by pantry widget additions); E2E regression: onboarding flow still completes without errors after new Convex queries were added in Sprint 3; E2E: pantry save counter increments correctly and turns amber at 8/10 (Gate 5 precondition visible); Verify Convex Dashboard: no orphaned pantry_items or daily_checkins for non-existent userIds; ✋ **Sprint 4 does not begin until this regression is green.**; **Tool:** Vitest · Playwright MCP · Convex Dashboard |

**EPIC 7 — Product Detail Redesign (Sprint 4, Weeks 7–8)**

| 7.1 | Build redesigned product detail page ( `/product/[id]` ). | 3 | Build product hero: image area, brand, name (serif), rating stars + count, description, Save + Compare buttons; Build score card: gradient background (green/amber/orange/red by tier), large score number, tier label, "See breakdown ›" link; Build retailers card: "Where to buy" with retailer chips (from products.retailers array); Breadcrumb nav: Home → Category → Subcategory → Product name |
| 7.2 | Build "What's inside" claims grid and ingredient detail panels. | 3 | Build "What's inside" section: 2-column grid of claims from product_claims (check icon for present, X icon for absent); Build ingredient list: each row has safety dot (green/amber/red), name, function label, icons (organic, non-gmo), score; Expandable detail panel per ingredient: detailExplanation text + profile-specific notes (e.g., "your profile flags Red 40"); Ingredient safety bar: horizontal gradient showing overall ingredient composition |
| 7.3 | Build "Why this works for you" callout and alternatives section. | 2 | Build "Why this works for you" card: shows how many profile flags match, lists which flags are satisfied; Build alternatives section: list of 3 alternatives with emoji, brand, name, score badge. "See all X alternatives" button; Build "Add to pantry" card in sidebar |
| 7.4 | ✅ TESTING: Product detail. | 2 | E2E: navigate to product detail, verify score card shows correct score and tier gradient; E2E: verify claims grid matches product_claims data; E2E: click ingredient row → detail panel expands with explanation; E2E: "Why this works for you" shows correct match count vs. total profile flags; E2E: "Add to pantry" toggles correctly; **Tool:** Playwright MCP |

**EPIC 8 — Premium + Advanced Features (Sprint 4, Weeks 7–8)**

| 8.1 | Build three-tier paywall, gating logic, and upgrade moment UX. | 3 | **Premium check:** update `isPremiumUser(ctx)` to validate `isPremium === true AND premiumUntil > Date.now()` — never boolean alone. Server-side only.; **Pricing / upgrade page:** display all three tiers (Free / Premium / Family). Family tier shown as "Coming soon" — displayed to anchor $39 as the mid-option, not yet purchasable. Annual ($39) shown as recommended. Monthly ($9.99) and Family ($69 annual) alongside.; **subscriptionStatus UI states:** "trialing" → show trial-days-remaining banner in nav. "past_due" → show payment-method banner (do NOT hard-lock features). "canceled" → graceful downgrade to free (no data loss).; **Gate 1 — Explore overflow:** after result #6 in Explore or #3 in "For You" on Home, render an inline overflow card (not a modal): "Showing 6 of N results. Premium shows all N sorted by your match % threshold." Match % badges must be visible on already-shown results before this card appears.; **Gate 2 — Comparison modal:** full modal with both product thumbnails + base scores visible above the lock. Copy names both products + specific comparison dimensions.; **Gate 3 — Premium filter rows:** show all filter rows in the sidebar; premium rows are visible but dimmed with an inline lock pill. Tapping shows "X filter is Premium. Upgrade to filter by match %, allergen-free, price range, and N more." No modal — inline only.; **Gate 4 — Ingredient detail with score delta:** show ingredient list + score delta (base → personal) above the lock. Lock fires only when score delta ≥ 8 pts. If delta < 8 pts, suppress this gate entirely. Copy: "[Ingredient] is flagged for your [Condition] profile."; **Gate 5 — Pantry limit:** pantry save counter visible from first save. Counter turns amber at 8/10. At 11th save attempt: inline banner at bottom of pantry (not modal): "Your pantry is full (10/10). Premium gives you unlimited products and a live health score." Include blurred health score card visual in the prompt.; **Gate 6 — Pantry health score teaser:** passive locked score card always visible in /pantry after first save. Small teal text CTA ("Start free trial") — secondary weight, must not compete with pantry contents.; **Guest user gates:** users browsing via "Explore without an account" do NOT hit premium feature gates. Instead, every gate location shows a signup prompt: "Create a free account to save your profile and start your 14-day Premium trial." Redirect to /onboarding or auth gate.; **Universal gate rules:** Never show an empty state as the gate — always show partial value first. Never stack two gates in the same session flow. Never interrupt mid-scan. Never hide premium filter rows.; Server-side: `browseProducts` caps at 6 results for non-premium. Match recommendations cap at 3. Comparison and advanced filters reject non-premium requests. |
| 8.2 | Build product comparison tool ( `/compare` ). | 3 | Build comparison page: select 2–4 products, show side-by-side; Compare: score, tier, ingredient count, flagged ingredient count, match %, claims comparison grid; Write query `compareProducts(productIds[])` that returns all fields for comparison; Premium-gated — free users see teaser with lock overlay |
| 8.3 | Build paste-ingredients analysis feature. | 3 | Build analysis modal/page: textarea for pasting raw ingredient list; Write action `analyzeIngredientList(rawText)` : AI parses comma-separated text into ingredient names, looks up scores, runs assembly formula; Display results inline: assembled score, tier, ingredient-by-ingredient breakdown; Option to save as a product (prompts for name and brand) |
| 8.4 | Build 14-day free trial mechanics. | 2 | On successful account creation after onboarding, auto-set: `isPremium: true` , `subscriptionStatus: "trialing"` , `premiumUntil: Date.now() + 14 days` via `users.startTrial()` mutation. No credit card required.; Build trial banner component: shows days remaining ("12 days left in your free trial"). Visible in nav when `subscriptionStatus === "trialing"` . Includes "Add payment method" CTA.; At day 12 (premiumUntil - 2 days): banner turns amber with urgency copy.; At day 14: graceful downgrade — set `isPremium: false` , `subscriptionStatus: "canceled"` . No data loss. Show one-time "Your trial has ended — you just lost X features" modal as a conversion moment.; Build past_due state: when `subscriptionStatus === "past_due"` , show payment banner in nav. Do NOT hard-lock any features — degrading UX during payment issues causes churn. |
| 8.5 | ✅ TESTING: Premium, comparison, paste-analysis, trial, and gate UX. | 2 | Unit test: `isPremiumUser` returns false when `premiumUntil` is expired even if `isPremium === true`; Unit test: `browseProducts` with isPremium=false caps at 6 results; premium user returns all; E2E: free user sees locked overflow card after result #6 — card shows correct total count; E2E: free user taps Compare → modal shows both product thumbnails + scores above the lock; E2E: premium filter rows are visible but dimmed; tapping shows inline lock pill, not modal; E2E: free user with <8pt score delta — Gate 4 ingredient lock does NOT appear; E2E: pantry counter shows 8/10 in amber; 11th save shows inline banner (not modal) with blurred health score; E2E: guest user (no account) hits explore overflow → sees signup prompt, not premium gate; E2E: account creation sets `subscriptionStatus: "trialing"` and trial banner appears in nav; E2E: manually set `premiumUntil` to past → verify isPremiumUser returns false and free caps apply; E2E: compare 2 products → verify scores, tiers, and claims display side-by-side; E2E: paste ingredients "sugar, red 40, flour" → verify score returned and ingredient breakdown shown; **Tool:** Vitest · Playwright MCP |

**◈ SPRINT 4 REGRESSION — End of Weeks 7–8 (before Sprint 5 begins)**

| R4 | Sprint 4 regression: product detail, paywall, trial, plus Sprints 1–3 carry-forward. | 3 | Re-run full Vitest suite — all unit tests from Sprints 1–4 must pass green; E2E full critical path: sign up (trial starts) → onboarding → /home → explore with free cap → product detail → expand ingredient panel → add to pantry → /pantry → health score teaser visible → attempt 11th save → inline banner appears; E2E: premium gating end-to-end — manually set `isPremium: true` and `premiumUntil` to future → verify all caps lift, premium filter rows unlock, comparison accessible; E2E: expired trial path — set `premiumUntil` to past → verify free caps re-apply across all routes (explore, home, pantry, compare); E2E regression: onboarding, home dashboard, pantry, explore still work correctly after product detail + paywall components were added; E2E regression: check-in, pantry save, and match % queries still return correct results — no broken Convex functions from Sprint 4 mutations; Manual: spot-check 10 product detail pages — verify score card gradient, claims grid, ingredient panels, and alternatives all render correctly; Manual: verify all 6 upgrade gates fire with the correct UX treatment (inline vs. modal) and do not stack in a single session flow; ✋ **Sprint 5 does not begin until this regression is green.**; **Tool:** Vitest · Playwright MCP · Convex Dashboard |

**EPIC 9 — Polish + User Validation (Sprint 5, Weeks 9–10)**

| 9.1 | Responsive polish and mobile navigation. | 3 | Mobile nav: tab bar (Home, Explore, Pantry, Profile) replacing sidebar; Mobile explore: filter sheet (slide-up) replacing sidebar filters; Mobile product detail: single column, score card full width, ingredients accordion; Test all routes at 375px, 768px, and 1180px breakpoints |
| 9.2 | Final pre-launch regression. | 2 | Re-run full Vitest suite against production branch — must be 100% green; Run full Playwright E2E suite against the Vercel production URL (not preview); E2E full critical path on production: new account → onboarding → /home → explore → product detail → pantry → trial banner → all 6 upgrade gates encountered and verified; Manual: spot-check 20 products for data quality (images, claims, scores consistent); Manual: verify all routes at 375px, 768px, and 1180px — catch any mobile regressions introduced by Sprint 5 polish; Manual: admin flow — ingredient queue, product browser, and batch scoring still work correctly (v3.1 admin must not have regressed); Note: unit and E2E coverage has been exercised in R1–R4; this is a final confidence check, not a first pass; **Tool:** Vitest · Playwright MCP |
| 9.3 | 10–15 Persona B interviews. | 3 | Recruit participants (health-motivated grocery shoppers); Script: signup flow, home dashboard reaction, explore browsing, product detail depth, pantry usage, "scoring in progress" reaction, upgrade gate reactions (which gate felt natural vs. intrusive), trial willingness to convert to paid ($39/year); Conduct interviews with live app; Compile validation report |
| 9.4 | Post-launch backlog and iteration plan. | 2 | Document top 5 user-requested features / pain points from Persona B interviews; Prioritize: **Stripe Phase 1 billing (highest priority)** , barcode scanning, social login, wellness trend charts, Family tier launch; Write user stories for top 3 items. Create Linear issues; Note Stripe Phase 1 scope: Annual + Monthly Checkout, webhook endpoint for 4 events, "Activating Premium…" poll UX, `stripeCustomerId` / `stripeSubscriptionId` / `subscriptionStatus` fields (already in schema as nulls); **Tool:** Linear MCP server |
| 9.5 | ✅ TESTING: Convert findings to acceptance criteria. | 1 | For each user issue, write a failing test case or acceptance criterion; Update test suite with edge cases from interviews; Log data quality issues for admin backfill |


---

### Section 03

## MCP Server & CLI Tool Reference

| Tool | Type | Install | Use | Stories |
|---|---|---|---|---|
| **Convex CLI** | npx convex | `npm install convex` | Schema push, deploy, env vars | 1.1, 2.1 |
| **Convex Dashboard** | Web UI | dashboard.convex.dev | Data inspection, enrichment verification | 1.4, 2.4, 3.5, 4.5 |
| **Anthropic SDK** | npm | `npm install @anthropic-ai/sdk` | Claims extraction, ingredient enrichment, paste analysis | 2.2, 2.3, 7.3 |
| **Open Food Facts** | REST API | No key needed | Product enrichment (categories, images, certs) | 2.1 |
| **GitHub CLI** | CLI | `brew install gh` | Create `feature-*` branches, open PRs, code review. All work must be on a `feature-` prefixed branch — no direct commits to `main` . | All |
| **Vitest** | npm | `npm i -D vitest` | Unit tests | 1.4, 2.4, 4.3, 5.4, 7.4 |
| **Playwright MCP** | MCP Server | `npm i -D playwright` | E2E tests | 3.5, 4.5, 5.3, 6.4, 7.4, 8.5 |
| **Linear MCP** | MCP Server | Claude.ai → Connected Tools | Backlog, sprint planning | 9.4 |
| **Stripe SDK** | npm | `npm i stripe` | Phase 1 billing (post-MVP). Schema fields stubbed at launch; webhook endpoint wired post-MVP. | 9.4 |
| **Vercel CLI** | npx vercel | `npm i -g vercel` | Frontend deploys | 8.2 |


---

### Section 04

## Definition of Done

- All work done on a Git branch named `feature-*` (e.g. `feature-schema-migration` , `feature-onboarding-redesign` ). No commits directly to `main` .
- Code committed to feature branch and PR-reviewed before merge.
- Convex schema pushes cleanly.
- Each epic's test story (yellow) must be complete before the next epic in the same sprint starts.
- Each sprint's regression story (purple) must be fully green before the next sprint begins. No sprint starts with a known failing test.
- Premium gating tested at each sprint regression: free user sees caps, premium user sees full data. `isPremiumUser` validates both `isPremium` and `premiumUntil > Date.now()` .
- Trial mechanics verified in Sprint 4 regression and Sprint 5 final: account creation triggers trial, banner shows days remaining, expired trial correctly reverts to free.
- All paywall gates use the correct UX treatment (inline cards/pills — not modals, except Gate 2). No gate fires before its precondition is met.
- All components render correctly at 375px, 768px, and 1180px.
- Deployed to Vercel preview and smoke-tested before regression is marked green.


---

### Section 05

## Post-MVP Backlog

- **Stripe Phase 1 (priority post-MVP):** Add Stripe Checkout for Annual ($39) and Monthly ($9.99) plans. Webhook endpoint `POST /api/stripe/webhook` validates signature before calling `users.setPremiumStatus` . Handle: `checkout.session.completed` , `customer.subscription.updated` , `customer.subscription.deleted` , `invoice.payment_failed` . Add "Activating Premium…" poll on return from Checkout.
- **Stripe Phase 2:** Stripe Customer Portal for self-serve plan management (upgrade, downgrade, cancel, invoices). Launch Family plan ($69/year) with per-profile conditions and shared pantry.
- Social login (Google, Apple) for one-tap signup
- Barcode scanning (camera → OFF UPC lookup)
- Wellness trend charts (mood × pantry score over time) — `subscriptionStatus` already reserved behind Premium
- Community feed / trending products
- Scientific advisor review workflow
- Retailer API integration (Target, Instacart) for live pricing/availability
- User-submitted product reviews and ratings
- Push notifications on tier changes for pantry products
- RevenueCat integration for iOS/Android in-app purchases (maps onto existing schema without replacing Stripe web)


---

*Clarvn · UI Redesign Delivery Plan · March 2026 · Confidential — for partner review only*
