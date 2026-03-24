#!/usr/bin/env npx tsx
/**
 * CleanList Bulk Seed Script — Operation 1
 *
 * Scores ~500 products from seed-products.json using the Claude API
 * and writes results to Convex via ConvexHttpClient.
 *
 * Usage:
 *   npx tsx scripts/bulk-seed.ts                # full run
 *   npx tsx scripts/bulk-seed.ts --dry-run      # validate without writing
 *   npx tsx scripts/bulk-seed.ts --limit 10     # score only first N products
 *
 * Requirements:
 *   ANTHROPIC_API_KEY env var must be set
 *   CONVEX_URL env var must be set (or uses NEXT_PUBLIC_CONVEX_URL)
 */

import Anthropic from "@anthropic-ai/sdk";
import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "../convex/_generated/api";
import {
  validateScoringResponse,
  type ScoringResponse,
} from "../convex/lib/validator";
import {
  SCORING_SYSTEM_PROMPT,
  buildScoringUserMessage,
} from "../convex/lib/scoringPrompt";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load .env.local for local dev
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// --- Config ---
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CONVEX_URL =
  process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
const MODEL_PRIMARY = "claude-sonnet-4-5";
const MODEL_FALLBACK = "claude-opus-4-5";
const MAX_TOKENS = 4096;
const DELAY_MS = 500;

if (!ANTHROPIC_API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY environment variable is required");
  process.exit(1);
}
if (!CONVEX_URL) {
  console.error(
    "❌ CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable is required"
  );
  process.exit(1);
}
// --- CLI args ---
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isProd = args.includes("--prod");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1]) : undefined;

const ACTIVE_URL = isProd
  ? (process.env.PROD_CONVEX_URL ?? CONVEX_URL)
  : CONVEX_URL;

if (isProd && !process.env.PROD_CONVEX_URL) {
  console.warn("⚠ --prod flag set but PROD_CONVEX_URL not found in .env.local, falling back to NEXT_PUBLIC_CONVEX_URL");
}

// --- Clients ---
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
const convex = new ConvexHttpClient(ACTIVE_URL!);

// --- Progress log ---
const LOG_FILE = path.resolve(__dirname, "seed-run.log");

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

// --- Types ---
interface SeedProduct {
  name: string;
  brand: string;
}

// --- Call Claude API ---
async function callClaude(
  productName: string,
  model: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    temperature: 0,
    system: SCORING_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildScoringUserMessage(productName),
      },
    ],
  });

  if (response.stop_reason === "max_tokens") {
    throw new Error("Response truncated — max_tokens limit reached");
  }
  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }
  return content.text;
}

// --- Score one product (with retry) ---
async function scoreProduct(
  productName: string
): Promise<ScoringResponse | null> {
  // Try primary model first
  for (let attempt = 1; attempt <= 2; attempt++) {
    const model = attempt === 1 ? MODEL_PRIMARY : MODEL_FALLBACK;
    try {
      const raw = await callClaude(productName, model);
      const validated = validateScoringResponse(raw);
      return validated;
    } catch (err) {
      const isLastAttempt = attempt === 2;
      if (isLastAttempt) {
        log(
          `  ✗ Failed after ${attempt} attempts: ${err instanceof Error ? err.message : String(err)}`
        );
        return null;
      }

      // Check if it's a rate limit / API error vs. validation error
      const isApiError =
        err instanceof Error &&
        (err.message.includes("rate limit") ||
          err.message.includes("overloaded") ||
          err.message.includes("timeout") ||
          err.message.includes("529"));

      if (isApiError) {
        log(`  ⚠ API error on attempt ${attempt}, waiting 5s before retry...`);
        await sleep(5000);
      } else {
        log(
          `  ⚠ Validation failed on attempt ${attempt} (${model}), retrying with ${MODEL_FALLBACK}...`
        );
      }
    }
  }
  return null;
}

// --- Write scored product to Convex ---
async function writeToConvex(
  scored: ScoringResponse,
  productName: string
): Promise<void> {
  // 1. Write product
  const productId = await convex.mutation(
    api.products.writeProductPublic as any,
    {
      name: scored.name,
      brand: scored.brand,
      emoji: scored.emoji,
      baseScore: scored.baseScore,
      tier: scored.tier,
      scoreVersion: 1,
      scoredAt: Date.now(),
    }
  );

  // 2. Upsert each ingredient and link to product
  for (const ing of scored.ingredients) {
    const ingredientId = await convex.mutation(
      api.ingredients.upsertIngredientPublic as any,
      {
        canonicalName: ing.canonicalName,
        aliases: ing.aliases ?? [],
        harmEvidenceScore: ing.harmEvidenceScore,
        regulatoryScore: ing.regulatoryScore,
        avoidanceScore: ing.avoidanceScore,
        baseScore: ing.baseScore,
        tier: ing.tier,
        flagLabel: ing.flagLabel,
        evidenceSources: ing.evidenceSources,
      }
    );

    await convex.mutation(api.ingredients.linkProductIngredientPublic as any, {
      productId,
      ingredientId,
    });

    // 3. Upsert condition modifiers for this ingredient
    const modifiers = scored.conditionModifiers.filter(
      (m) => m.ingredientCanonicalName === ing.canonicalName
    );
    for (const mod of modifiers) {
      await convex.mutation(
        api.ingredients.upsertConditionModifierPublic as any,
        {
          ingredientId,
          condition: mod.condition,
          modifierAmount: mod.modifierAmount,
          evidenceCitation: mod.evidenceCitation,
          evidenceQuality: mod.evidenceQuality,
        }
      );
    }
  }

  // 4. Auto-queue alternatives
  for (const alt of scored.alternatives) {
    const existing = await convex.query(api.products.getProduct, {
      name: alt.name,
    });
    if (!existing) {
      await convex.mutation(api.scoringQueue.addToQueue, {
        productName: alt.name,
        source: "alternative",
        priority: 2,
        sourceProductId: productId,
      });
      log(`  → Queued alternative: ${alt.name}`);
    }
  }
}

// --- Helpers ---
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Main ---
async function main() {
  const seedPath = path.resolve(__dirname, "seed-products.json");
  const allProducts: SeedProduct[] = JSON.parse(
    fs.readFileSync(seedPath, "utf-8")
  );
  const products = limit ? allProducts.slice(0, limit) : allProducts;

  console.log(
    `\n🌱 CleanList Bulk Seed${isDryRun ? " [DRY RUN]" : ""}${isProd ? " [PROD]" : " [DEV]"}`
  );
  console.log(`   Products to process: ${products.length}`);
  console.log(`   Convex URL: ${ACTIVE_URL}`);
  console.log(`   Log file: ${LOG_FILE}\n`);

  let scored = 0;
  let skipped = 0;
  let failed = 0;
  let alternativesQueued = 0;

  for (let i = 0; i < products.length; i++) {
    const { name, brand } = products[i];
    const prefix = `[${i + 1}/${products.length}]`;

    // Resumability: skip already-scored products
    if (!isDryRun) {
      const existing = await convex.query(api.products.getProduct, { name });
      if (existing) {
        log(`${prefix} SKIP (already scored): ${name}`);
        skipped++;
        continue;
      }
    }

    log(`${prefix} Scoring: ${name} (${brand})`);

    if (isDryRun) {
      log(`  → [dry-run] would call Claude API`);
      scored++;
      await sleep(50);
      continue;
    }

    const result = await scoreProduct(name);

    if (!result) {
      // Write to queue for retry via Operation 2.
      // Using "alternative" source (no auth required from CLI).
      await convex.mutation(api.scoringQueue.addToQueue, {
        productName: name,
        source: "alternative",
        priority: 3,
      });
      log(`  → Written to queue for retry`);
      failed++;
    } else {
      await writeToConvex(result, name);
      const altCount = result.alternatives.length;
      alternativesQueued += altCount;
      log(
        `  ✓ Scored: baseScore=${result.baseScore} tier=${result.tier} alts=${altCount}`
      );
      scored++;
    }

    // Rate-limit delay
    await sleep(DELAY_MS);
  }

  // Summary
  console.log(`\n📊 Seed Run Complete`);
  console.log(`   ✓ Scored:    ${scored}`);
  console.log(`   → Skipped:   ${skipped} (already in DB)`);
  console.log(`   ✗ Failed:    ${failed} (written to queue for retry)`);
  console.log(`   🔗 Alternatives queued: ${alternativesQueued}`);
  log(
    `SUMMARY scored=${scored} skipped=${skipped} failed=${failed} alts=${alternativesQueued}`
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
