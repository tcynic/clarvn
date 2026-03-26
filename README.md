# clarvn

Food product scoring app. Evaluates grocery products by scoring **ingredients** individually, then assembling **product scores** deterministically. Produces a universal base score (1–10) and a personalized score adjusted by the user's health profile. Consumer layer adds pantry management, profile match scoring, category browsing, wellness check-ins, and a three-tier premium subscription (Free / Premium / Family).

## Stack

- **Frontend** — Next.js 16, React 19, TypeScript, Tailwind CSS 4, App Router
- **Backend** — Convex (reactive database, server functions, auth, crons)
- **AI** — Anthropic Claude (`claude-sonnet-4-5` for scoring, `claude-sonnet-4-6` for alternatives + claims extraction)
- **Auth** — Convex Auth with email/password
- **Payments** — Manual `isPremium` flag (MVP); Stripe integration planned
- **Hosting** — Vercel (frontend), Convex Cloud (backend)

## Project structure

```
src/
  app/
    page.tsx              # Landing page
    layout.tsx            # Root layout + ConvexClientProvider
    app/
      page.tsx            # Consumer shopping app (requires auth)
      BrowsePanel.tsx     # Category browsing + faceted filters
      ListSidebar.tsx     # Shopping list sidebar
      ProductDetail.tsx   # Product detail with ingredients + claims
      ProductRow.tsx      # Product card component
      ProfilePanel.tsx    # User health profile summary
      ScorePill.tsx       # Score tier badge
    login/                # Consumer auth (sign in / sign up)
    onboarding/           # 6-screen chip-based health profile setup
    admin/
      page.tsx            # Scoring queue dashboard
      layout.tsx          # Admin layout + auth guard
      products/           # Product browser
      ingredients/        # Ingredient queue browser
      login/              # Admin auth

  components/
    TierBadge.tsx
  lib/
    personalScore.ts      # Client-side personal score calculation

convex/
  schema.ts               # 14-table schema + auth tables
  scoringQueue.ts         # Scoring queue management
  products.ts             # Product read/write functions
  ingredients.ts          # Ingredient + modifier functions
  ingredientQueue.ts      # Ingredient scoring queue
  ingredientScoring.ts    # Per-ingredient Claude scoring action
  scoring.ts              # scoreProduct action, refreshCheck
  assembly.ts             # Weighted-worst score assembly
  extraction.ts           # Ingredient extraction action
  extractionMutations.ts  # Extraction queue mutations
  alternatives.ts         # Safer alternatives queries
  alternativesMutations.ts
  deduplication.ts        # Ingredient dedup logic
  brandSuggestions.ts     # Brand autocomplete
  onboarding.ts           # User profile save/read
  userProfiles.ts         # Profile flag queries
  shoppingList.ts         # Shopping list mutations
  http.ts                 # HTTP actions (webhooks)
  crons.ts                # Cron jobs (auto-process scoring queue every 5 min)
  auth.ts                 # Convex Auth config
  auth.config.ts
  lib/
    scoringPrompt.ts          # Claude system prompt (product scoring)
    ingredientScoringPrompt.ts # Claude system prompt (ingredient scoring)
    validator.ts              # Zod schema for AI responses
    auth.ts                   # requireAdmin helper
    authHelpers.ts

scripts/
  bulk-seed.ts            # Bulk seed CLI (Operation 1)
  seed-products.json      # 478 products across 14 categories
```

## Local development

**Prerequisites:** Node 20+, npm, Anthropic API key, Convex account

```bash
npm install

# In one terminal — keep this running
npx convex dev

# In another terminal
npm run dev
```

App runs at `http://localhost:3000`. Admin at `http://admin.localhost:3000/login`.
Consumer login at `http://localhost:3000/login`.

## Environment variables

Managed in `.env.local` (not committed):

| Variable | Description |
|---|---|
| `CONVEX_DEPLOYMENT` | Dev deployment name (set by `npx convex dev`) |
| `NEXT_PUBLIC_CONVEX_URL` | Dev Convex URL |
| `PROD_CONVEX_URL` | Production Convex URL (for seed script `--prod` flag) |
| `ANTHROPIC_API_KEY` | Anthropic API key (used by seed script) |

Convex environment variables (set via CLI):

```bash
npx convex env set ANTHROPIC_API_KEY sk-ant-...   # for scoreProduct action
npx convex env set ADMIN_EMAILS you@example.com   # restrict admin access

# Production
npx convex env set ANTHROPIC_API_KEY sk-ant-... --prod
npx convex env set ADMIN_EMAILS you@example.com --prod
```

## Admin account setup

1. Go to `http://admin.localhost:3000/login`
2. Sign up with your email and password
3. Optionally restrict access: `npx convex env set ADMIN_EMAILS you@example.com`

## Bulk seed script

Scores ~478 products via the Claude API and writes results to Convex. Resumable — skips already-scored products. Estimated runtime ~40 min, ~$2.50 API cost.

```bash
# Dev dry-run (no API calls, no DB writes)
npx tsx scripts/bulk-seed.ts --dry-run

# Dev — full run
npx tsx scripts/bulk-seed.ts

# Production dry-run
npx tsx scripts/bulk-seed.ts --prod --dry-run

# Production — full run
npx tsx scripts/bulk-seed.ts --prod

# Limit to first N products
npx tsx scripts/bulk-seed.ts --limit=20
```

Requires `ANTHROPIC_API_KEY` in `.env.local`.

## Deployment

```bash
# Deploy Convex functions to production
npx convex deploy

# Deploy frontend to Vercel
npx vercel --prod
```

Ensure `NEXT_PUBLIC_CONVEX_URL` is set in Vercel dashboard to the production Convex URL.

## Testing

```bash
npm test           # run once
npm run test:watch # watch mode
```

## Score tiers

| Tier | Score | Meaning |
|---|---|---|
| Clean | 1.0–3.9 | No significant concern |
| Watch | 4.0–5.9 | Some evidence of concern |
| Caution | 6.0–7.9 | Meaningful concern, consider swapping |
| Avoid | 8.0–10.0 | Strong evidence of harm or major regulatory action |

Personal score = base score + Σ(applicable profile modifiers), capped at 10.0.

## Premium tiers

| Tier | Access |
|---|---|
| Free | Limited explore results, basic product detail |
| Premium | Full explore, comparison tool, advanced filters, full ingredient detail |
| Family | Premium + multi-profile household features (planned) |

Premium is gated server-side via `isPremium + premiumUntil > Date.now()` on the user record. Stripe integration is planned; MVP uses manual admin grants.

---

*March 2026 · Confidential*
