#!/usr/bin/env npx tsx
/**
 * clarvn Batch Extract Claims — Epic 2, Story 2.3
 *
 * For each product with 0 claims after OFF enrichment, calls Claude to infer
 * likely certifications/claims. All results stored with verified=false.
 *
 * Usage:
 *   npx tsx scripts/batch-extract-claims.ts              # full run
 *   npx tsx scripts/batch-extract-claims.ts --dry-run    # validate without writing
 *   npx tsx scripts/batch-extract-claims.ts --limit=20   # process only first N
 *   npx tsx scripts/batch-extract-claims.ts --prod       # use PROD_CONVEX_URL
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
const DELAY_MS = 800; // longer due to AI call inside the action

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
const LOG_FILE = path.resolve(__dirname, "extract-claims-run.log");

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
    `\n🏷  clarvn Batch Extract Claims${isDryRun ? " [DRY RUN]" : ""}${isProd ? " [PROD]" : " [DEV]"}`
  );
  console.log(`   Convex URL: ${ACTIVE_URL}`);
  console.log(`   Log file: ${LOG_FILE}\n`);

  const allProducts = await convex.query(api.products.listProducts, {
    status: "scored",
  });

  // Find products with 0 claims (OFF enrichment should have run first)
  const noClaims: typeof allProducts = [];
  for (const product of allProducts) {
    const claims = await convex.query(api.products.getProductClaims, {
      productId: product._id,
    });
    if (claims.length === 0) {
      noClaims.push(product);
    }
  }

  const products = limit ? noClaims.slice(0, limit) : noClaims;

  console.log(`   Total scored products: ${allProducts.length}`);
  console.log(`   Products with 0 claims: ${noClaims.length}`);
  console.log(`   To process: ${products.length}\n`);

  let success = 0;
  let noClaimsFound = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const prefix = `[${i + 1}/${products.length}]`;

    log(`${prefix} ${product.name} (${product.brand})`);

    if (isDryRun) {
      log(`  → [dry-run] would call extractClaims`);
      success++;
      await sleep(50);
      continue;
    }

    try {
      const result = await convex.action(api.enrichment.extractClaims, {
        productId: product._id,
      });

      if (result.claims.length > 0) {
        log(`  ✓ Extracted ${result.claims.length} claims: ${result.claims.join(", ")}`);
        success++;
      } else {
        log(`  ~ No claims identified`);
        noClaimsFound++;
      }
    } catch (err) {
      log(`  ✗ Error: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n📊 Claim Extraction Complete`);
  console.log(`   ✓ Had claims extracted: ${success}`);
  console.log(`   ~ No claims found:      ${noClaimsFound}`);
  console.log(`   ✗ Failed:               ${failed}`);
  log(`SUMMARY success=${success} no_claims=${noClaimsFound} failed=${failed}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
