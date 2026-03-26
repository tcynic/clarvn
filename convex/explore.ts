import { v } from "convex/values";
import { query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { isPremiumUser } from "./lib/premium";
import { Doc, Id } from "./_generated/dataModel";

const FREE_LIMIT = 6;

// All claim keys recognized by the explore filter panel.
const ALL_CLAIM_KEYS = [
  "gluten_free",
  "dairy_free",
  "nut_free",
  "soy_free",
  "no_artificial_colors",
  "no_added_sugar",
  "no_preservatives",
  "usda_organic",
  "non_gmo",
  "kosher",
  "vegan",
] as const;

// Claims that require a premium subscription to filter by.
// Free filters: score range (tier) and certifications (usda_organic, non_gmo, kosher, vegan).
// Premium filters: all free-from claims.
const PREMIUM_CLAIMS = new Set([
  "gluten_free",
  "dairy_free",
  "nut_free",
  "soy_free",
  "no_artificial_colors",
  "no_added_sugar",
  "no_preservatives",
]);

type SortOption = "best_match" | "highest_score" | "most_reviewed" | "price_asc";
type TierOption = "Clean" | "Watch" | "Caution";
type PriceRange = "under_5" | "5_to_15" | "over_15";

function matchesPriceRange(price: number | undefined, range: PriceRange): boolean {
  if (price === undefined) return false;
  if (range === "under_5") return price < 5;
  if (range === "5_to_15") return price >= 5 && price <= 15;
  return price > 15;
}

function sortProducts(products: Doc<"products">[], sort: SortOption): Doc<"products">[] {
  return [...products].sort((a, b) => {
    if (sort === "price_asc") {
      const pa = a.price ?? Infinity;
      const pb = b.price ?? Infinity;
      return pa - pb;
    }
    if (sort === "most_reviewed") {
      return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
    }
    // best_match and highest_score both sort by baseScore desc
    return (b.baseScore ?? 0) - (a.baseScore ?? 0);
  });
}

/**
 * Paginated product browse with category, claims, tier, price, and sort filtering.
 *
 * Branch A (no claims): uses Convex indexes with native .paginate() — fast path.
 * Branch B (claims active): set-intersection via by_claim index, then in-memory
 * filter/sort, then simulated pagination — required because cross-table AND logic
 * can't be expressed as a single index traversal.
 *
 * Free-tier cap: non-premium users receive at most FREE_LIMIT (6) results.
 */
export const exploreProducts = query({
  args: {
    paginationOpts: paginationOptsValidator,
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    claims: v.optional(v.array(v.string())),
    tier: v.optional(
      v.union(v.literal("Clean"), v.literal("Watch"), v.literal("Caution"))
    ),
    priceRange: v.optional(
      v.union(v.literal("under_5"), v.literal("5_to_15"), v.literal("over_15"))
    ),
    sort: v.optional(
      v.union(
        v.literal("best_match"),
        v.literal("highest_score"),
        v.literal("most_reviewed"),
        v.literal("price_asc")
      )
    ),
  },
  handler: async (ctx, args) => {
    const isPremium = await isPremiumUser(ctx);

    // Gate 3 server-side: strip premium-only claims for non-premium users.
    // Free users cannot bypass the UI gate via direct API calls.
    let effectiveClaims = args.claims ?? [];
    const strippedClaims: string[] = [];
    if (!isPremium && effectiveClaims.length > 0) {
      const allowed: string[] = [];
      for (const c of effectiveClaims) {
        if (PREMIUM_CLAIMS.has(c)) {
          strippedClaims.push(c);
        } else {
          allowed.push(c);
        }
      }
      effectiveClaims = allowed;
    }

    const hasClaims = effectiveClaims.length > 0;

    let page: Doc<"products">[];
    let isDone: boolean;
    let continueCursor: string;

    if (!hasClaims) {
      // ── Branch A: index-based pagination ──────────────────────────────────
      // All paths filter status === "scored" via compound indexes to exclude
      // archived products. Subcategory uses a dedicated index when category is
      // also provided; otherwise it falls back to post-pagination filtering.
      let result;
      if (args.category && args.subcategory) {
        // Subcategory index handles category + subcategory + status in one pass
        result = await ctx.db
          .query("products")
          .withIndex("by_status_and_category_and_subcategory", (q) =>
            q
              .eq("status", "scored")
              .eq("category", args.category!)
              .eq("subcategory", args.subcategory!)
          )
          .paginate(args.paginationOpts);
      } else if (args.category && args.tier) {
        result = await ctx.db
          .query("products")
          .withIndex("by_status_and_category_and_tier", (q) =>
            q
              .eq("status", "scored")
              .eq("category", args.category!)
              .eq("tier", args.tier!)
          )
          .paginate(args.paginationOpts);
      } else if (args.category) {
        result = await ctx.db
          .query("products")
          .withIndex("by_status_and_category", (q) =>
            q.eq("status", "scored").eq("category", args.category!)
          )
          .paginate(args.paginationOpts);
      } else if (args.tier) {
        result = await ctx.db
          .query("products")
          .withIndex("by_status_and_tier", (q) =>
            q.eq("status", "scored").eq("tier", args.tier!)
          )
          .paginate(args.paginationOpts);
      } else {
        result = await ctx.db
          .query("products")
          .withIndex("by_status", (q) => q.eq("status", "scored"))
          .paginate(args.paginationOpts);
      }

      page = result.page;
      isDone = result.isDone;
      continueCursor = result.continueCursor;

      // Price range is always applied post-pagination (no index)
      if (args.priceRange) {
        page = page.filter((p) => matchesPriceRange(p.price, args.priceRange!));
      }
      // Sort the page slice in-memory when a sort is requested
      if (args.sort) {
        page = sortProducts(page, args.sort);
      }
    } else {
      // ── Branch B: set-intersection for claims + in-memory filtering ───────
      // 1. For each required claim, collect product IDs via by_claim index
      const claimIdSets = await Promise.all(
        effectiveClaims.map(async (claim) => {
          const rows = await ctx.db
            .query("product_claims")
            .withIndex("by_claim", (q) => q.eq("claim", claim))
            .take(8192);
          return new Set(rows.map((r) => r.productId as string));
        })
      );

      // 2. Intersect all sets → IDs with ALL required claims
      const [first, ...rest] = claimIdSets;
      const intersected = rest.reduce((acc, s) => {
        const result = new Set<string>();
        for (const id of acc) {
          if (s.has(id)) result.add(id);
        }
        return result;
      }, first ?? new Set<string>());

      // 3. Fetch products by ID in parallel (IDs came from product_claims.productId — typed as Id<"products">)
      const fetched = await Promise.all(
        Array.from(intersected).map((id) => ctx.db.get(id as Id<"products">))
      );
      let products = fetched.filter((p): p is Doc<"products"> => p !== null && p.status === "scored");

      // 4. Apply category / subcategory / tier / price filters
      if (args.category) {
        products = products.filter((p) => p.category === args.category);
      }
      if (args.subcategory) {
        products = products.filter((p) => p.subcategory === args.subcategory);
      }
      if (args.tier) {
        products = products.filter((p) => p.tier === args.tier);
      }
      if (args.priceRange) {
        products = products.filter((p) => matchesPriceRange(p.price, args.priceRange!));
      }

      // 5. Sort
      const sort = args.sort ?? "best_match";
      products = sortProducts(products, sort);

      // 6. Simulate cursor-based pagination using numeric offset
      const numItems = args.paginationOpts.numItems;
      const offset = args.paginationOpts.cursor
        ? parseInt(args.paginationOpts.cursor, 10)
        : 0;
      const safeOffset = isNaN(offset) ? 0 : offset;

      page = products.slice(safeOffset, safeOffset + numItems);
      isDone = safeOffset + numItems >= products.length;
      continueCursor = isDone ? "" : String(safeOffset + numItems);
    }

    const totalCount = page.length; // approximate for display

    // ── Free-tier cap ──────────────────────────────────────────────────────
    if (!isPremium && page.length > FREE_LIMIT) {
      return {
        page: page.slice(0, FREE_LIMIT),
        isDone: false,
        continueCursor: "",
        totalCount: page.length,
        cappedForFree: true,
        strippedClaims,
      };
    }

    return {
      page,
      isDone,
      continueCursor,
      totalCount,
      cappedForFree: false,
      strippedClaims,
    };
  },
});

/**
 * Returns count of products that have each known claim, optionally scoped to a category.
 * Used to show "(N)" counts next to filter checkboxes.
 */
export const getExploreFilterCounts = query({
  args: {
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const counts: Record<string, number> = {};

    // If category is specified, build a set of product IDs in that category first
    let categoryProductIds: Set<string> | null = null;
    if (args.category && args.subcategory) {
      const products = await ctx.db
        .query("products")
        .withIndex("by_status_and_category_and_subcategory", (q) =>
          q
            .eq("status", "scored")
            .eq("category", args.category!)
            .eq("subcategory", args.subcategory!)
        )
        .take(8192);
      categoryProductIds = new Set(products.map((p) => p._id as string));
    } else if (args.category) {
      const products = await ctx.db
        .query("products")
        .withIndex("by_status_and_category", (q) =>
          q.eq("status", "scored").eq("category", args.category!)
        )
        .take(8192);
      categoryProductIds = new Set(products.map((p) => p._id as string));
    }

    for (const claim of ALL_CLAIM_KEYS) {
      const rows = await ctx.db
        .query("product_claims")
        .withIndex("by_claim", (q) => q.eq("claim", claim))
        .take(8192);

      if (categoryProductIds) {
        counts[claim] = rows.filter((r) => categoryProductIds!.has(r.productId as string)).length;
      } else {
        counts[claim] = rows.length;
      }
    }

    return counts;
  },
});
