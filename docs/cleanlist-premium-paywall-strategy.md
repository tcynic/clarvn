# CleanList — Premium Paywall Strategy

**Version:** 1.0 · March 2026 · Confidential  
**Informs:** Architecture v3.3 §6.6 · PRD v2.2  
**Resolves:** 3 cross-doc conflicts on personalization gating  
**Target conversion:** 5–8% freemium (vs Yuka's 0.45–2.5%)  
**Recommended price:** $39 / year

---

> ⚠️ **3 cross-document conflicts resolved in this document.**
> (1) Architecture v3.3 gives free users limited match % — market deep-dive locks all personalization behind premium.
> (2) Onboarding was redesigned to prove personalization value before the paywall — but a hard personalization lock creates a bait-and-switch after signup.
> (3) Architecture uses count caps (3 results, 6 explore) while the market doc uses feature-type gates (no comparison, no advanced filters). Mixing philosophies makes the free tier incoherent to users.
> **Resolution: free tier gets personalization taste, premium gets personalization depth.**

---

## Section 01 — Core philosophy

The paywall is a **depth gate, not an access gate**. Free users experience real, personalized CleanList — just at shallower volume and detail. The free tier must feel meaningfully better than any competitor, so users hit the paywall already convinced.

> **Principle: taste → desire → upgrade.** Every gate should fire when a user already has evidence that the premium feature is worth having — not before they've tried it. "I want more of this" is the conversion trigger. "I can't do anything" kills growth.

### The three-tier model

#### Free — $0 / forever
*Personalized but shallow. Enough to prove the value — not enough to replace premium.*

- ✓ Unlimited barcode scanning
- ✓ Product score + tier badge (A–F)
- ✓ Ingredient flag count + basic list
- ✓ Match % badge on scanned products
- ✓ Up to 3 "For You" results on home
- ✓ 6 explore results (generic sort)
- ✓ Generic alternatives (score-ranked)
- ✓ Pantry: save up to 10 products
- ✓ Wellness check-ins (unlimited)
- ✓ Paste-ingredients: 3 analyses/day
- ◐ Ingredient detail: summary only (2 lines, no profile notes)
- — ~~Product comparison~~
- — ~~Advanced filters~~
- — ~~Personalized alternatives~~
- — ~~Pantry health score & trends~~

#### Premium — $39 / year *(Recommended)*
*Full depth, full explore, full personalization. The complete CleanList experience.*

- ✓ Everything in Free
- ✓ Unlimited explore, sorted by match %
- ✓ Full match % on all products
- ✓ Full ingredient detail panels with profile-specific notes
- ✓ Product comparison (2–4 side-by-side)
- ✓ Advanced filters: claims, free-from, score range, price
- ✓ Unlimited pantry + pantry health score
- ✓ Pantry health score trends over time
- ✓ Personalized alternatives (match % ranked)
- ✓ Paste-ingredients: unlimited
- ✓ Priority in scoring queue
- ◎ Check-in mood trends + diet correlation *(Roadmap)*

#### Family — $69 / year
*Premium for the whole household. Persona B's power tier — shopping for kids drives the upgrade.*

- ✓ Everything in Premium
- ✓ Up to 6 household profiles
- ✓ Per-profile match % + conditions
- ✓ Kids-specific scoring (dyes, nitrates, sugars)
- ✓ Shared pantry view across profiles
- ✓ Teen (13–17) and Baby scoring ranges
- ◎ School meal compliance alerts *(Roadmap)*
- ◎ Shared shopping list with per-member flags *(Roadmap)*

> **MVP scope note.** For the MVP, only Free and Premium are live. Family tier can be announced but held back until per-profile conditions and shared pantry are built. Showing all three tiers at launch signals the roadmap and anchors the $39 price as the mid-option.

---

## Section 02 — Full feature boundary table

*The authoritative reference for what is free, partially gated, or fully premium. Supersedes Architecture v3.3 §6.6.*

### Scanning & scoring

| Feature | Free | Premium | Family | Notes |
|---|:---:|:---:|:---:|---|
| Barcode scan | ✓ | ✓ | ✓ | No limit. Scanning is the growth loop — never gate it. |
| Product score + tier badge | ✓ | ✓ | ✓ | Core free value proposition. |
| Ingredient flag count | ✓ | ✓ | ✓ | Always visible. |
| Ingredient detail panel | Summary | ✓ Full | ✓ Full | Free sees plain-language description + function (2 lines). Premium adds safety assessment + profile-specific notes. |
| Match % badge on scanned products | ✓ | ✓ | ✓ | Always shown on individually viewed products. Unlimited on product detail pages. |
| Paste-ingredients analysis | 3/day | ✓ Unlimited | ✓ Unlimited | Daily cap resets at midnight. Count shown in UI. |

### Discovery & explore

| Feature | Free | Premium | Family | Notes |
|---|:---:|:---:|:---:|---|
| Home "For You" results | 3 results | ✓ Unlimited | ✓ Unlimited | Free sees 3 + "See all with Premium" CTA. |
| Explore results | 6 results | ✓ Unlimited | ✓ Unlimited | Free: no personalization sort. Premium: sorted by match %. |
| Personalized match % sorting in explore | — | ✓ | ✓ | Premium-only. Free sees generic score-ranked results. |
| Advanced filters (claims, free-from, score range, price) | — | ✓ | ✓ | Filter panel shows with lock icons on premium filters for free users. |
| Generic alternatives (score-ranked) | ✓ | ✓ | ✓ | Non-personalized. Always available. |
| Personalized alternatives (match % ranked) | — | ✓ | ✓ | Requires premium. Replaces generic alternatives on product detail. |

### Pantry

| Feature | Free | Premium | Family | Notes |
|---|:---:|:---:|:---:|---|
| Save products to pantry | 10 max | ✓ Unlimited | ✓ Unlimited | Counter shown: "7 / 10 saved." Upgrade prompt on 11th add attempt. |
| Pantry health score | — | ✓ | ✓ | Aggregate score across pantry products. Premium-only — the payoff for building a pantry. |
| Pantry health score trends over time | — | ✓ | ✓ | Time-series graph. Roadmap item — include in premium scope from day 1. |

### Comparison & tools

| Feature | Free | Premium | Family | Notes |
|---|:---:|:---:|:---:|---|
| Product comparison (2–4 side-by-side) | — | ✓ | ✓ | Hard gate. Comparison is a deliberate, high-intent action — appropriate paywall moment. |
| Wellness check-ins | ✓ | ✓ | ✓ | Always free. Cheap to serve, builds daily habit and retention. |
| Check-in mood trends + diet correlation | — | ✓ Roadmap | ✓ Roadmap | Phase 2 feature. Reserve behind premium from launch. |
| Priority scoring queue | — | ✓ | ✓ | Premium scans jump the queue when a product isn't yet scored. |

### Household & profiles (Family tier)

| Feature | Free | Premium | Family | Notes |
|---|:---:|:---:|:---:|---|
| Single health profile | ✓ | ✓ | ✓ | All tiers. Onboarding builds this before auth. |
| Multiple household profiles (up to 6) | — | — | ✓ | Family-only. Per-profile conditions, age ranges, match %. |
| Kids-specific scoring display | — | — | ✓ | Dyes, nitrates, added sugars scoring by age range (Baby / Toddler / Child / Teen). |
| Shared pantry view | — | — | ✓ Roadmap | Phase 2. |

---

## Section 03 — Upgrade moment UX

Six natural gates — each fires only after the user has already experienced partial value. The gate copy leads with what they'll unlock, not what they can't do.

> ⚠️ **Score delta precondition (from design guidelines):** "If a user encounters the subscription gate before seeing a personal score differ from the base score, the paywall is appearing too early. The personalisation aha moment — the score delta — must land first. That delta is the product's core value proof." This precondition applies to every gate that depends on personalization (moments 1, 2, 4). If no score delta has been seen yet, suppress those gates.

> **Universal UX rules:** (1) Never show a blank or empty state as the gate — always show partial value first, then lock the rest. (2) Every gate copy must be contextual — name the specific feature and specific benefit. "Upgrade" is not a benefit. (3) Never hide premium filters — show them locked. (4) Every count cap must be visible before the limit hits — never a surprise.

### Copy formula

All gate copy follows one pattern: **[specific thing they'll get] — [why it's specific to them].** The copy must reference something the user has already seen or done in the current session — a product they scanned, a condition in their profile, a count they watched accumulate. Generic copy ("Upgrade to Premium for full access") is the failure mode.

### The six moments

| # | Trigger | UX treatment | Copy template | Copy formula | Precondition |
|---|---|---|---|---|---|
| **1** | User scrolls past result #6 in Explore or #3 in Home "For You" | Inline overflow card — no modal interrupt | *"Showing 6 of 247 results. Premium shows all 247 sorted by your match % threshold."* | Count shown + total N named + match % referenced | User must have seen match % badges on the visible results. Gate uses the match % they've already experienced as the pull. |
| **2** | User taps Compare after selecting a second product | Full modal with partial preview — show both product thumbnails and scores before the lock | *"Compare [Product A] vs [Product B] — scores, match %, flagged ingredients, and certifications."* | Name both products. Name the specific comparison dimensions. Never just "Comparison is Premium". | Both product thumbnails + their scores must be visible inside the modal before the lock. The partial value (A vs C) makes the upgrade feel concrete. |
| **3** | User taps a premium filter row in the filter panel | Inline lock pill on the row — no modal. Free filters remain fully functional. | *"Match % filter is Premium. Upgrade to filter by match %, allergen-free, price range, and 5 more."* | Name the tapped filter. Name 2 others. Give a total count. | No prerequisite. Free filters (Score A–F, Certifications) stay enabled. Premium filter rows are visible but dimmed — never hidden. |
| **4** | User expands ingredient detail panel where personalized score delta is ≥ 8 pts | Ingredient list + score delta visible above the lock. Profile notes section locked with overlay. | *"Red 40 is flagged for your ADHD profile. See exactly how this affects your score and what to watch for."* | Name the specific ingredient + the specific condition. This is the highest-value copy in the app — make it personal, not generic. | **Score delta (base → your score) must be visible before the lock fires.** This is the design guideline aha moment. If delta < 8 pts, do not show this gate. |
| **5** | User attempts to save an 11th product to their pantry | Inline banner at bottom of pantry — not a modal. Counter visible from the start; turns amber at 8/10. | *"Your pantry is full (10/10). Premium gives you unlimited products and a live health score across everything you track."* | Show the count. Name both unlocks. Include a blurred health score card visual inside the prompt — let them see what they're about to get. | Counter (e.g. "8/10 saved") must be visible before the limit is reached. At 8/10 the counter turns amber as an early warning. The gate should never be a surprise. |
| **6** | User opens Pantry tab after saving their first product (passive, always visible) | Locked score card inline — no modal. Small teal text CTA, not a primary button. | *"Unlock your pantry health score." CTA: "Start free trial" — small teal text.* | Keep it short. This is a passive teaser, not a hard gate. The product list below must always be fully accessible. | No prerequisite. Always shows. The CTA must be secondary weight so it doesn't compete with the pantry contents the user came to see. |

### What not to do

- **Don't interrupt mid-scan.** The scan result always fully loads regardless of tier. No gates on the primary scan → score → detail flow.
- **Don't show an empty explore.** Free users see 6 real, match%-tagged results — not a placeholder behind a wall.
- **Don't stack gates.** A user hitting one gate should not encounter a second gate in the same session flow without a clear path forward.
- **Don't gate wellness check-ins.** They're cheap to serve and are the primary daily habit driver.
- **Don't show gate copy before the aha moment.** If the user hasn't seen a score delta yet, suppress personalization-dependent gates (moments 1, 2, 4). A user who hasn't felt the product's value won't upgrade — they'll churn.

---

## Section 04 — Pricing structure

$39/year is the recommended price — above Yuka's median payment, below comparable health apps, with a personalization premium that is justified and market-tested.

| Plan | Price | Effective monthly | Notes |
|---|---|---|---|
| Free | $0 / forever | — | Growth driver. No card required. |
| **Premium Annual** *(recommended)* | **$39 / year** | **$3.25 / month** | Primary conversion target. Annual retention is 2× monthly. 14-day free trial — no CC required. |
| Premium Monthly | $9.99 / month | — | Exists for users who won't commit annually. Annual saves 67%. |
| Family Annual | $69 / year | $5.75 / month | Hold for Phase 2. Announce at launch to anchor pricing. |
| 14-Day Free Trial | Full Premium | Auto-converts to $39 annual | Starts at profile completion (onboarding). Industry data: 17–32 day trials convert at 45.7%. |

> The gap between $9.99/mo and $39/yr ($3.25/mo effective) is significant — monthly is nearly 3× more expensive annualized. This should push the majority toward annual.

### Conversion funnel model

| Stage | % | Notes |
|---|---|---|
| Total installs | 100% | Viral / organic / search |
| Day 7 active users | ~60% | Typical health app D7 retention |
| Reaches a paywall gate | ~35% | After 3–5 scans |
| Starts 14-day trial | ~15% | Triggered at profile completion |
| Converts to paid annual | **5–8%** | Target. Yuka benchmark: 0.45–2.5% |

*5–8% target requires personalization gate to fire at the right moment — trial trigger at profile completion is the key lever.*

---

## Section 05 — Stripe integration path

Three-phase approach: manual MVP flag for launch speed, Stripe Checkout for post-MVP revenue capture, Customer Portal for self-serve management.

### Phase 0 — Manual MVP flag *(Launch)*

No Stripe integration. `isPremium` is a boolean set manually by admin. `premiumUntil` timestamp controls expiry. Used for early access users, beta testers, and the founding cohort.

```
isPremium: v.boolean()
premiumUntil: v.optional(v.number())
```

### Phase 1 — Stripe Checkout + Webhooks *(Post-MVP · Priority)*

Add Stripe Checkout for Annual and Monthly plans. Webhook flips `isPremium` on payment success / subscription cancellation. Add `stripeCustomerId` and `stripeSubscriptionId` to the users schema. New internal endpoint: `POST /api/stripe/webhook` validates signature before calling `users.setPremiumStatus` mutation.

```
stripeCustomerId: v.optional(v.string())
stripeSubscriptionId: v.optional(v.string())
subscriptionStatus: v.optional(v.string())
```

### Phase 2 — Customer Portal *(Phase 2)*

Stripe Customer Portal for self-serve plan management: upgrade, downgrade, cancel, view invoices. Removes the need to build custom subscription management UI. Sync subscription status changes back via webhooks. Add Family plan as a Stripe product.

```
planTier: v.optional(
  v.union(v.literal("premium"),
  v.literal("family"))
)
```

### Schema delta for `user_profiles` table

| Field | Type | Phase | Notes |
|---|---|---|---|
| `premiumUntil` | `v.optional(v.number())` | Phase 0 | Unix timestamp. `isPremium` check should also validate `premiumUntil > Date.now()` server-side. |
| `stripeCustomerId` | `v.optional(v.string())` | Phase 1 | Set on first checkout session creation. |
| `stripeSubscriptionId` | `v.optional(v.string())` | Phase 1 | Active subscription ID. Null if on free tier or manual flag. |
| `subscriptionStatus` | `v.optional(v.string())` | Phase 1 | `"active" \| "trialing" \| "canceled" \| "past_due"`. Synced from Stripe webhook. Used for granular UI states (e.g. `past_due` shows a banner, not a hard lock). |
| `planTier` | `v.optional(v.union(...))` | Phase 2 | `"premium" \| "family"`. Needed when Family tier launches to gate multi-profile features separately from base premium. |

> **Webhook security (from v3.3 §8):** The Stripe webhook endpoint must validate the signature using `stripe.webhooks.constructEvent()` before calling any Convex mutation. Events to handle: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

> **Mobile path (future):** When the mobile app is built, add RevenueCat as a subscription management layer on top of Stripe. RevenueCat unifies iOS App Store, Google Play, and Stripe web purchases under a single SDK and a single source of truth for `isPremium` — mapping cleanly onto the existing `user_profiles` schema. Apple and Google require in-app purchases for subscriptions sold inside a native app; RevenueCat handles this without replacing Stripe for web. No changes to the current Stripe integration are needed to accommodate this later.

### Trial mechanics

The 14-day free trial starts automatically when a user completes the onboarding profile and creates an account — no credit card required. At day 12, a "trial ending soon" nudge appears in-app. At day 14, if no payment method is added, the user gracefully reverts to Free tier (no hard lock, no data loss). The trial is shown prominently in the Stripe product as a free trial period on the annual plan.

---

## Section 06 — Open decisions

*Items that need a call before build. Each has a recommended default.*

**Does the trial require a credit card?**
Recommended: No CC. No-CC trials eliminate the most common drop-off point (credit card friction at signup). Given CleanList's personalization value, the bet is that users who complete onboarding will pay voluntarily. Revisit after first 1,000 trial starts.

**Should the explore gate show match % on locked results?**
Recommended: Yes — show the badge, blur the value. Seeing "Match: ??" creates more desire than seeing nothing. The curiosity gap is the upgrade driver. Alternative: show "Match: 94%" on the first 3 and blur subsequent ones — stronger but may feel manipulative.

**Annual-only vs annual + monthly at launch?**
Recommended: Both from launch. Monthly at $9.99 exists for users who won't commit. The gap to $39 annual ($3.25/mo effective) versus $9.99/mo is significant — monthly is nearly 3× more expensive annualized, which should push the majority toward annual.

**When does the trial start — onboarding completion or first premium gate hit?**
Recommended: Onboarding completion (account creation). This ties the trial to the highest-intent moment. Starting it at the first gate hit extends the "free" window but delays the conversion clock. Onboarding is already the activation moment — align the trial with it.

**Should "Explore without an account" users hit paywalls?**
Recommended: No premium gate — but use the gate as a signup prompt. Guest users exploring via localStorage profile should hit gates that say "Create a free account to save your profile and start your 14-day Premium trial" — converting them to registered free users is the priority, not pushing them directly to payment.

---

## Section 07 — Risks

| Severity | Risk | Mitigation |
|---|---|---|
| 🔴 High | **Free tier feels generic after the personalized onboarding.** Users complete 6 screens of personalization, see a compelling preview — then sign up and hit a 6-result, unfiltered explore. | Ensure Home screen always leads with at least 3 personalized "For You" results and the match % badge is visible everywhere on scanned products. |
| 🔴 High | **14-day trial ends without reminder conversion.** Users who start a trial and don't add a CC will silently revert to free. | In-app nudge at day 12, email at day 13, graceful downgrade (no data loss) at day 14. The downgrade itself is a conversion moment — "You just lost X features." |
| 🟡 Medium | **Pantry limit too aggressive at 10.** Persona B shoppers may save 20+ products before hitting the limit. | Tune post-launch — 10 is a starting point, not a hard commitment. The architecture allows changing this with a single server-side constant. |
| 🟡 Medium | **Gate copy undersells the upgrade.** Generic "Upgrade to Premium" copy loses conversions. | Every gate must be contextual — name the specific feature and the specific benefit. "Upgrade" is not a benefit. "See how Red 40 affects your ADHD profile" is a benefit. |
| 🟢 Low | **Stripe webhook race condition on signup.** If a user subscribes and immediately opens the app, the webhook may not have fired yet and `isPremium` may still be false. | Show an "Activating your Premium…" loading state on return from Stripe Checkout, poll for status change for up to 10 seconds before showing the free tier. |

---

*CleanList · Premium Paywall Strategy v1.0 · March 2026 · Confidential — for partner review only*
