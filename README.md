# CleanList

Food product scoring app. Evaluates grocery products based on ingredient safety evidence, regulatory consensus, and avoidance priority. Produces a universal base score (1–10) and a personalized score adjusted by the user's health profile.

## Stack

- **Frontend** — Next.js 16, TypeScript, Tailwind CSS 4, App Router
- **Backend** — Convex (reactive database, server functions, auth)
- **AI** — Anthropic Claude (`claude-sonnet-4-5`, Opus fallback)
- **Auth** — Convex Auth with email/password
- **Hosting** — Vercel (frontend), Convex Cloud (backend)

## Project structure

```
src/
  app/
    page.tsx              # Consumer shopping list app
    onboarding/           # 3-step health profile onboarding
    admin/
      page.tsx            # Scoring queue (admin)
      products/           # Product browser (admin)
      login/              # Admin auth
  lib/
    personalScore.ts      # Client-side personal score calculation
  components/
    TierBadge.tsx

convex/
  schema.ts               # 5-table schema + auth tables
  scoringQueue.ts         # Queue management functions
  products.ts             # Product read/write functions
  ingredients.ts          # Ingredient + modifier functions
  scoring.ts              # scoreProduct action (Op 2), refreshCheck (Op 3)
  auth.ts                 # Convex Auth config
  lib/
    scoringPrompt.ts      # Claude system prompt (Scoring Algorithm Spec v1.0)
    validator.ts          # Zod schema for AI responses
    auth.ts               # requireAdmin helper

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

App runs at `http://localhost:3000`. Admin at `/admin/login`.

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

1. Go to `/admin/login`
2. Click **"First time? Create account"**
3. Sign up with your email and password
4. Optionally restrict access: `npx convex env set ADMIN_EMAILS you@example.com`

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

32 tests across:
- Convex foundation (queue dedup, product roundtrip, auth enforcement)
- Zod validator (AI response validation)
- Personal score calculation (base case, cap at 10, no matching conditions)

## Score tiers

| Tier | Score | Meaning |
|---|---|---|
| Clean | 1.0–3.9 | No significant concern |
| Watch | 4.0–5.9 | Some evidence of concern |
| Caution | 6.0–7.9 | Meaningful concern, consider swapping |
| Avoid | 8.0–10.0 | Strong evidence of harm or major regulatory action |

Personal score = base score + Σ(applicable profile modifiers), capped at 10.0. Health data never leaves the device.

---

*March 2026 · Confidential*
