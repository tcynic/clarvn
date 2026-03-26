"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { NavBar } from "@/components/ui/NavBar";
import { CategoryPillRow } from "@/components/explore/CategoryPillRow";
import { ExploreHeader } from "@/components/explore/ExploreHeader";
import { ExploreFilterSidebar } from "@/components/explore/ExploreFilterSidebar";
import { ExploreFilterSheet } from "@/components/explore/ExploreFilterSheet";
import { ExploreResultsGrid } from "@/components/explore/ExploreResultsGrid";
import {
  CATEGORY_OPTIONS,
  DEFAULT_FILTERS,
  ExploreFilters,
  SortValue,
} from "@/lib/exploreConstants";
import { usePremiumGate } from "@/hooks/usePremiumGate";

const PAGE_SIZE = 12;

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  // ── Deserialise filters from URL ──────────────────────────────────────────
  const catLabel = searchParams.get("cat") ?? "All";
  const catOption = CATEGORY_OPTIONS.find((o) => o.label === catLabel) ?? CATEGORY_OPTIONS[0];
  const rawClaims = searchParams.get("claims");
  const activeClaims = rawClaims ? rawClaims.split(",").filter(Boolean) : [];
  const tierParam = searchParams.get("tier") as ExploreFilters["tier"] | null;
  const priceParam = searchParams.get("price") as ExploreFilters["priceRange"] | null;
  const sortParam = (searchParams.get("sort") ?? DEFAULT_FILTERS.sort) as SortValue;

  const filters: ExploreFilters = {
    category: catOption.value,
    subcategory: catOption.subcategory,
    claims: activeClaims,
    tier: tierParam,
    priceRange: priceParam,
    sort: sortParam,
  };

  // ── Serialise filters back to URL ─────────────────────────────────────────
  const updateURL = useCallback(
    (update: Partial<ExploreFilters> & { catLabel?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (update.catLabel !== undefined) params.set("cat", update.catLabel);

      const newClaims = update.claims ?? activeClaims;
      if (newClaims.length > 0) params.set("claims", newClaims.join(","));
      else params.delete("claims");

      const newTier = "tier" in update ? update.tier : tierParam;
      if (newTier) params.set("tier", newTier);
      else params.delete("tier");

      const newPrice = "priceRange" in update ? update.priceRange : priceParam;
      if (newPrice) params.set("price", newPrice);
      else params.delete("price");

      const newSort = update.sort ?? sortParam;
      if (newSort && newSort !== DEFAULT_FILTERS.sort) params.set("sort", newSort);
      else params.delete("sort");

      // Reset pagination cursor on filter change
      setCursor(null);
      router.replace(`/explore?${params.toString()}`);
    },
    [searchParams, activeClaims, tierParam, priceParam, sortParam, router]
  );

  function handleCategoryChange(value: string | null, subcategory: string | null) {
    const label = CATEGORY_OPTIONS.find(
      (o) => o.value === value && o.subcategory === subcategory
    )?.label ?? "All";
    updateURL({ catLabel: label, claims: activeClaims });
  }

  function handleFilterChange(update: Partial<ExploreFilters>) {
    updateURL(update);
  }

  // ── Queries ───────────────────────────────────────────────────────────────
  const subscriptionStatus = useQuery(
    api.userProfiles.getSubscriptionStatus,
    isAuthenticated ? {} : "skip"
  );
  const isAdmin = useQuery(
    api.userProfiles.getIsAdmin,
    isAuthenticated ? {} : "skip"
  );
  const pantryProductIds = useQuery(
    api.pantry.getMyPantryProductIds,
    isAuthenticated ? {} : "skip"
  );
  const filterCounts = useQuery(api.explore.getExploreFilterCounts, {
    category: filters.category ?? undefined,
    subcategory: filters.subcategory ?? undefined,
  });

  const exploreResult = useQuery(api.explore.exploreProducts, {
    paginationOpts: { numItems: PAGE_SIZE, cursor },
    category: filters.category ?? undefined,
    subcategory: filters.subcategory ?? undefined,
    claims: filters.claims.length > 0 ? filters.claims : undefined,
    tier: filters.tier ?? undefined,
    priceRange: filters.priceRange ?? undefined,
    sort: filters.sort,
  });

  const isPremium = subscriptionStatus?.isPremium ?? false;
  const daysRemaining = subscriptionStatus?.daysRemaining ?? null;
  const subStatus = subscriptionStatus?.subscriptionStatus ?? null;
  const pantrySet = new Set<string>((pantryProductIds ?? []).map((id) => id as string));
  const isLoading = authLoading || exploreResult === undefined;

  const { isGuest, hasSeenScoreDelta } = usePremiumGate({
    isAuthenticated,
    isPremium,
    subscriptionStatus: subStatus,
  });

  const page = exploreResult?.page ?? [];
  const isDone = exploreResult?.isDone ?? true;
  const totalCount = exploreResult?.totalCount ?? 0;
  const cappedForFree = exploreResult?.cappedForFree ?? false;

  // Redirect unauthenticated users to login
  if (!authLoading && !isAuthenticated) {
    router.replace("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--surface)] pb-24">
      <NavBar
        isPremium={isPremium}
        daysRemaining={daysRemaining}
        subscriptionStatus={subStatus}
        isAdmin={isAdmin ?? false}
      />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <ExploreHeader
          totalCount={cappedForFree ? Math.max(totalCount, page.length) : page.length}
          cappedForFree={cappedForFree}
          sort={filters.sort}
          onSortChange={(sort) => updateURL({ sort })}
          onOpenFilters={() => setFilterSheetOpen(true)}
        />

        <div className="mb-4">
          <CategoryPillRow
            selectedLabel={catLabel}
            onChange={handleCategoryChange}
          />
        </div>

        <div className="flex gap-6 items-start">
          <ExploreFilterSidebar
            filters={filters}
            filterCounts={filterCounts ?? {}}
            onChange={handleFilterChange}
            isPremium={isPremium}
          />

          <div className="flex-1 min-w-0">
            <ExploreResultsGrid
              products={page}
              cappedForFree={cappedForFree}
              totalCount={totalCount}
              isLoading={isLoading}
              pantrySet={pantrySet}
              isAuthenticated={isAuthenticated}
              isGuest={isGuest}
              hasSeenScoreDelta={hasSeenScoreDelta}
              isDone={isDone}
              onLoadMore={() => {
                if (exploreResult?.continueCursor) {
                  setCursor(exploreResult.continueCursor);
                }
              }}
            />
          </div>
        </div>
      </main>

      <ExploreFilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        filters={filters}
        filterCounts={filterCounts ?? {}}
        onChange={handleFilterChange}
        isPremium={isPremium}
      />
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense>
      <ExploreContent />
    </Suspense>
  );
}
