"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { NavBar } from "@/components/ui/NavBar";
import { ProductCard } from "@/components/ui/ProductCard";

type SortKey = "date" | "score" | "name";

type Tier = "Clean" | "Watch" | "Caution" | "Avoid";

const TIER_BANNER: Record<Tier, { bg: string; color: string }> = {
  Clean:   { bg: "var(--tier-clean-light)",   color: "var(--tier-clean)" },
  Watch:   { bg: "var(--tier-watch-light)",   color: "var(--tier-watch)" },
  Caution: { bg: "var(--tier-caution-light)", color: "var(--tier-caution)" },
  Avoid:   { bg: "var(--tier-avoid-light)",   color: "var(--tier-avoid)" },
};

function scoreToTier(score: number): Tier {
  if (score >= 7.5) return "Clean";
  if (score >= 5.0) return "Watch";
  if (score >= 2.5) return "Caution";
  return "Avoid";
}

export default function PantryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [sort, setSort] = useState<SortKey>("date");

  const pantryItems = useQuery(
    api.pantry.getMyPantry,
    isAuthenticated ? {} : "skip"
  );
  const stats = useQuery(
    api.pantry.getPantryStats,
    isAuthenticated ? {} : "skip"
  );
  const subscriptionStatus = useQuery(
    api.userProfiles.getSubscriptionStatus,
    isAuthenticated ? {} : "skip"
  );
  const isAdmin = useQuery(
    api.userProfiles.getIsAdmin,
    isAuthenticated ? {} : "skip"
  );

  const removeFromPantry = useMutation(api.pantry.removeFromPantry);

  // Redirect unauthenticated users
  if (!isLoading && !isAuthenticated) {
    router.replace("/login");
    return null;
  }

  const isPremium = subscriptionStatus?.isPremium ?? false;
  const daysRemaining = subscriptionStatus?.daysRemaining ?? null;

  const sorted = useMemo(() => {
    if (!pantryItems) return [];
    const items = [...pantryItems];
    if (sort === "date") {
      return items.sort((a, b) => b.pantryItem.addedAt - a.pantryItem.addedAt);
    }
    if (sort === "score") {
      return items.sort(
        (a, b) => (b.product?.baseScore ?? -1) - (a.product?.baseScore ?? -1)
      );
    }
    // name
    return items.sort((a, b) =>
      (a.product?.name ?? "").localeCompare(b.product?.name ?? "")
    );
  }, [pantryItems, sort]);

  const avgTier =
    stats?.averageScore != null ? scoreToTier(stats.averageScore) : null;
  const bannerStyle = avgTier ? TIER_BANNER[avgTier] : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center">
        <span className="text-sm text-[var(--ink-3)]">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface)] pb-24">
      <NavBar
        isPremium={isPremium}
        daysRemaining={daysRemaining}
        isAdmin={isAdmin ?? false}
      />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <h1
          className="text-2xl font-semibold text-[var(--ink)]"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Your Pantry
        </h1>

        {/* Health score banner */}
        {stats && stats.averageScore !== null && bannerStyle && (
          <div
            className="rounded-xl px-5 py-4 flex items-center justify-between"
            style={{ background: bannerStyle.bg }}
            data-testid="health-score-banner"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: bannerStyle.color }}>
                Pantry health score
              </p>
              <p className="text-3xl font-bold mt-0.5" style={{ color: bannerStyle.color }}>
                {stats.averageScore.toFixed(1)}
                <span className="text-base font-semibold ml-2">· {avgTier}</span>
              </p>
            </div>
            <span className="text-4xl" aria-hidden="true">
              {avgTier === "Clean" ? "✅" : avgTier === "Watch" ? "⚠️" : avgTier === "Caution" ? "🟠" : "🔴"}
            </span>
          </div>
        )}

        {/* Stats row */}
        {stats && stats.totalItems > 0 && (
          <div className="flex flex-wrap gap-2 text-sm" data-testid="stats-row">
            <span className="b-gray">{stats.totalItems} total</span>
            {stats.tierBreakdown.Clean > 0 && (
              <span className="b-clean">{stats.tierBreakdown.Clean} Clean</span>
            )}
            {stats.tierBreakdown.Watch > 0 && (
              <span className="b-watch">{stats.tierBreakdown.Watch} Watch</span>
            )}
            {stats.tierBreakdown.Caution > 0 && (
              <span className="b-caution">{stats.tierBreakdown.Caution} Caution</span>
            )}
            {stats.tierBreakdown.Avoid > 0 && (
              <span className="b-avoid">{stats.tierBreakdown.Avoid} Avoid</span>
            )}
          </div>
        )}

        {/* Sort controls */}
        {stats && stats.totalItems > 0 && (
          <div className="flex items-center gap-2" data-testid="sort-controls">
            <span className="text-xs text-[var(--ink-3)]">Sort:</span>
            {(["date", "score", "name"] as SortKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                className={`filter-pill${sort === key ? " active" : ""}`}
              >
                {key === "date" ? "Date added" : key === "score" ? "Score" : "Name"}
              </button>
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {pantryItems === undefined && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="product-card animate-pulse bg-[var(--surface-2)]" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {pantryItems !== undefined && sorted.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🛒</p>
            <p className="text-base font-medium text-[var(--ink)] mb-2">
              Your pantry is empty
            </p>
            <p className="text-sm text-[var(--ink-3)] mb-6">
              Browse products and tap ♡ to save them here.
            </p>
            <a
              href="/home"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-[var(--teal)] text-white text-sm font-semibold hover:bg-[var(--teal-dark)] transition-colors"
            >
              Browse products
            </a>
          </div>
        )}

        {/* Product grid */}
        {sorted.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {sorted.map(({ pantryItem, product }) => {
              if (!product) return null;
              return (
                <div key={pantryItem._id} className="relative group">
                  <ProductCard
                    name={product.name}
                    brand={product.brand}
                    emoji={product.emoji}
                    imageUrl={product.imageUrl}
                    baseScore={product.baseScore}
                    tier={product.tier as Tier | undefined}
                    price={product.price}
                    inPantry={true}
                    onSelect={() => router.push(`/product/${pantryItem.productId}`)}
                    onTogglePantry={() =>
                      removeFromPantry({ productId: pantryItem.productId })
                    }
                  />
                  {/* Remove button overlay */}
                  <button
                    type="button"
                    onClick={() =>
                      removeFromPantry({ productId: pantryItem.productId })
                    }
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 text-[var(--ink-3)] hover:text-[var(--tier-avoid)] hover:bg-white text-xs font-bold shadow transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    aria-label={`Remove ${product.name} from pantry`}
                    data-testid="remove-from-pantry"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
