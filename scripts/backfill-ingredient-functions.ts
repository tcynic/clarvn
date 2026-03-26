#!/usr/bin/env npx tsx
/**
 * clarvn Ingredient Function Backfill — Epic 2, Story 2.2
 *
 * For each scored ingredient missing ingredientFunction/detailExplanation,
 * calls the backfillIngredientFunction Convex action (which calls Claude).
 *
 * Usage:
 *   npx tsx scripts/backfill-ingredient-functions.ts              # full run
 *   npx tsx scripts/backfill-ingredient-functions.ts --dry-run    # validate without writing
 *   npx tsx scripts/backfill-ingredient-functions.ts --limit=50   # process only first N
 *   npx tsx scripts/backfill-ingredient-functions.ts --prod       # use PROD_CONVEX_URL
 *
 * Requirements:
 *   NEXT_PUBLIC_CONVEX_URL (or CONVEX_URL) env var must be set
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const CONVEX_URL = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
const DELAY_MS = 500;

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

async function main() {
  console.log(
    `\n🧪 clarvn Ingredient Function Backfill${isDryRun ? " [DRY RUN]" : ""}${isProd ? " [PROD]" : " [DEV]"}`
  );
  console.log(`   Convex URL: ${ACTIVE_URL}`);
  console.log(`   Log file: ${LOG_FILE}\n`);

  // Fetch all ingredients via pagination
  let cursor: string | null = null;
  const allIngredients: Array<{
    _id: string;
    canonicalName: string;
    ingredientFunction?: string;
    scoreVersion?: number;
  }> = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const page = await convex.query(api.ingredients.listIngredientsForBackfill, {
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
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < ingredients.length; i++) {
    const ingredient = ingredients[i];
    const prefix = `[${i + 1}/${ingredients.length}]`;

    log(`${prefix} ${ingredient.canonicalName}`);

    if (isDryRun) {
      log(`  → [dry-run] would call backfillIngredientFunction`);
      success++;
      await sleep(50);
      continue;
    }

    try {
      const result = await convex.action(
        api.enrichment.backfillIngredientFunction,
        { ingredientId: ingredient._id as any }
      );

      if (result.skipped) {
        log(`  → Already populated, skipped`);
        skipped++;
      } else {
        log(`  ✓ ${result.ingredientFunction}`);
        success++;
      }
    } catch (err) {
      log(`  ✗ Error: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n📊 Ingredient Function Backfill Complete`);
  console.log(`   ✓ Success:  ${success}`);
  console.log(`   → Skipped:  ${skipped}`);
  console.log(`   ✗ Failed:   ${failed}`);
  log(`SUMMARY success=${success} skipped=${skipped} failed=${failed}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
