#!/usr/bin/env npx tsx
/**
 * clarvn Batch Enrich Script — Epic 2, Story 2.1
 *
 * Enriches existing products with category, image, and claims from Open Food Facts.
 * Skips products that already have a category set (resumable).
 *
 * Usage:
 *   npx tsx scripts/batch-enrich-off.ts              # full run
 *   npx tsx scripts/batch-enrich-off.ts --dry-run    # validate without writing
 *   npx tsx scripts/batch-enrich-off.ts --limit=10   # process only first N products
 *   npx tsx scripts/batch-enrich-off.ts --prod       # use PROD_CONVEX_URL
 *
 * Requirements:
 *   NEXT_PUBLIC_CONVEX_URL (or CONVEX_URL) env var must be set
 *   The caller must be an admin in the Convex deployment
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const CONVEX_URL = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
const DELAY_MS = 600; // slightly longer for OFF + mutation calls

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
const LOG_FILE = path.resolve(__dirname, "enrich-off-run.log");

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
    `\n🌿 clarvn OFF Enrichment${isDryRun ? " [DRY RUN]" : ""}${isProd ? " [PROD]" : " [DEV]"}`
  );
  console.log(`   Convex URL: ${ACTIVE_URL}`);
  console.log(`   Log file: ${LOG_FILE}\n`);

  const allProducts = await convex.query(api.products.listProducts, {
    status: "scored",
  });

  // Filter to products without a category (not yet enriched)
  const toEnrich = allProducts.filter((p) => !p.category);
  const products = limit ? toEnrich.slice(0, limit) : toEnrich;

  console.log(`   Total scored products: ${allProducts.length}`);
  console.log(`   Already enriched (have category): ${allProducts.length - toEnrich.length}`);
  console.log(`   To enrich: ${products.length}\n`);

  let enriched = 0;
  let notFound = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const prefix = `[${i + 1}/${products.length}]`;

    log(`${prefix} ${product.name} (${product.brand})`);

    if (isDryRun) {
      log(`  → [dry-run] would call enrichProductFromOFF`);
      enriched++;
      await sleep(50);
      continue;
    }

    try {
      const result = await convex.action(api.enrichment.enrichProductFromOFF, {
        productId: product._id,
      });

      if (result.enriched) {
        log(
          `  ✓ Enriched: category=${result.category ?? "none"} claims=${result.claims?.length ?? 0} image=${result.imageUrl ? "yes" : "no"}`
        );
        enriched++;
      } else {
        log(`  ~ Not found in OFF`);
        notFound++;
      }
    } catch (err) {
      log(`  ✗ Error: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n📊 OFF Enrichment Complete`);
  console.log(`   ✓ Enriched:   ${enriched}`);
  console.log(`   ~ Not found:  ${notFound}`);
  console.log(`   ✗ Failed:     ${failed}`);
  log(`SUMMARY enriched=${enriched} not_found=${notFound} failed=${failed}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
