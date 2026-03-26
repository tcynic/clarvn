#!/usr/bin/env npx tsx
/**
 * clarvn Ingredient Function Backfill — Epic 2, Story 2.2
 *
 * For each scored ingredient missing ingredientFunction/detailExplanation,
 * calls Claude to classify the function and write a 2-sentence explanation.
 *
 * Usage:
 *   npx tsx scripts/backfill-ingredient-functions.ts              # full run
 *   npx tsx scripts/backfill-ingredient-functions.ts --dry-run    # validate without writing
 *   npx tsx scripts/backfill-ingredient-functions.ts --limit=50   # process only first N
 *   npx tsx scripts/backfill-ingredient-functions.ts --prod       # use PROD_CONVEX_URL
 *
 * Requirements:
 *   ANTHROPIC_API_KEY env var must be set
 *   NEXT_PUBLIC_CONVEX_URL (or CONVEX_URL) env var must be set
 */

import Anthropic from "@anthropic-ai/sdk";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import {
  INGREDIENT_FUNCTION_SYSTEM_PROMPT,
  buildIngredientFunctionMessage,
} from "../convex/lib/ingredientFunctionPrompt";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CONVEX_URL = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
const MODEL = "claude-sonnet-4-6";
const DELAY_MS = 500;

if (!ANTHROPIC_API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY environment variable is required");
  process.exit(1);
}
if (!CONVEX_URL) {
  console.error("❌ CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable is required");
  process.exit(1);
}

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isProd = args.includes("--prod");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1]) : undefined;

const ACTIVE_URL = isProd
  ? (process.env.PROD_CONVEX_URL ?? CONVEX_URL)
  : CONVEX_URL;

if (isProd && !process.env.PROD_CONVEX_URL) {
  console.warn("⚠ --prod flag set but PROD_CONVEX_URL not found, falling back to NEXT_PUBLIC_CONVEX_URL");
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
const convex = new ConvexHttpClient(ACTIVE_URL!);
const LOG_FILE = path.resolve(__dirname, "backfill-functions-run.log");

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface FunctionResult {
  ingredientFunction: string;
  detailExplanation: string;
}

async function callClaude(ingredientName: string): Promise<FunctionResult | null> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 256,
      temperature: 0,
      system: INGREDIENT_FUNCTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildIngredientFunctionMessage(ingredientName),
        },
      ],
    });

    if (response.stop_reason === "max_tokens") {
      throw new Error("Response truncated — max_tokens limit reached");
    }

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    let text = content.text.trim();
    text = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(text);

    if (typeof parsed.ingredientFunction !== "string" || typeof parsed.detailExplanation !== "string") {
      throw new Error("Missing required fields in response");
    }

    return {
      ingredientFunction: parsed.ingredientFunction.trim(),
      detailExplanation: parsed.detailExplanation.trim(),
    };
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log(
    `\n🧪 clarvn Ingredient Function Backfill${isDryRun ? " [DRY RUN]" : ""}${isProd ? " [PROD]" : " [DEV]"}`
  );
  console.log(`   Model: ${MODEL}`);
  console.log(`   Convex URL: ${ACTIVE_URL}`);
  console.log(`   Log file: ${LOG_FILE}\n`);

  // Fetch all ingredients using pagination
  let cursor: string | null = null;
  const allIngredients: Array<{ _id: string; canonicalName: string; ingredientFunction?: string; scoreVersion?: number }> = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const page = await convex.query(api.ingredients.listIngredients, {
      paginationOpts: { numItems: 100, cursor },
    });
    allIngredients.push(...(page.page as typeof allIngredients));
    if (page.isDone) break;
    cursor = page.continueCursor;
  }

  // Filter to scored ingredients missing ingredientFunction
  const toBackfill = allIngredients.filter(
    (i) => (i.scoreVersion ?? 0) > 0 && !i.ingredientFunction
  );
  const ingredients = limit ? toBackfill.slice(0, limit) : toBackfill;

  console.log(`   Total ingredients: ${allIngredients.length}`);
  console.log(`   Already have function: ${allIngredients.length - toBackfill.length}`);
  console.log(`   To backfill: ${ingredients.length}\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < ingredients.length; i++) {
    const ingredient = ingredients[i];
    const prefix = `[${i + 1}/${ingredients.length}]`;

    log(`${prefix} ${ingredient.canonicalName}`);

    if (isDryRun) {
      log(`  → [dry-run] would call Claude API`);
      success++;
      await sleep(50);
      continue;
    }

    const result = await callClaude(ingredient.canonicalName);

    if (!result) {
      log(`  ✗ Failed to get function/explanation`);
      failed++;
    } else {
      try {
        await convex.mutation(api.enrichmentMutations.patchIngredientEnrichmentPublic, {
          ingredientId: ingredient._id as any,
          ingredientFunction: result.ingredientFunction,
          detailExplanation: result.detailExplanation,
        });
        log(`  ✓ ${result.ingredientFunction}: ${result.detailExplanation.slice(0, 60)}...`);
        success++;
      } catch (err) {
        log(`  ✗ Write error: ${err instanceof Error ? err.message : String(err)}`);
        failed++;
      }
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n📊 Ingredient Function Backfill Complete`);
  console.log(`   ✓ Success: ${success}`);
  console.log(`   ✗ Failed:  ${failed}`);
  log(`SUMMARY success=${success} failed=${failed}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
