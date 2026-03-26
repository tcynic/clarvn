"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { NavBar } from "@/components/ui/NavBar";
import { ProductSelector, ProductChip } from "@/components/compare/ProductSelector";
import { ComparisonGrid } from "@/components/compare/ComparisonGrid";
import { ComparisonTeaser } from "@/components/compare/ComparisonTeaser";

interface ProductOption {
  id: string;
  name: string;
  brand?: string;
  emoji?: string;
  imageUrl?: string;
  baseScore?: number;
  tier?: string;
}

export default function ComparePage() {
  const searchParams = useSearchParams();
  const { isAuthenticated } = useConvexAuth();

  const subscriptionStatus = useQuery(
    api.userProfiles.getSubscriptionStatus,
    isAuthenticated ? {} : "skip"
  );
  const isAdmin = useQuery(
    api.userProfiles.getIsAdmin,
    isAuthenticated ? {} : "skip"
  );

  const isPremium = subscriptionStatus?.isPremium ?? false;
  const daysRemaining = subscriptionStatus?.daysRemaining ?? null;
  const subStatus = subscriptionStatus?.subscriptionStatus ?? null;
  const isGuest = !isAuthenticated;

  // Initialize from URL param ?products=id1,id2,...
  const [selectedProducts, setSelectedProducts] = useState<ProductOption[]>([]);

  // Fetch initial product teasers for URL-seeded IDs
  const urlProductIds = (searchParams.get("products") ?? "")
    .split(",")
    .filter(Boolean)
    .slice(0, 4);

  const teaserData = useQuery(
    api.compare.compareProductsTeaser,
    urlProductIds.length > 0
      ? { productIds: urlProductIds as Id<"products">[] }
      : "skip"
  );

  // Seed selectedProducts from URL on first load
  useEffect(() => {
    if (teaserData && selectedProducts.length === 0) {
      setSelectedProducts(
        teaserData
          .filter(Boolean)
          .map((p) => ({
            id: p!.id,
            name: p!.name,
            brand: p!.brand,
            emoji: p!.emoji,
            imageUrl: p!.imageUrl,
            baseScore: p!.baseScore,
            tier: p!.tier,
          }))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teaserData]);

  // Full comparison data (premium only)
  const productIds = selectedProducts.map((p) => p.id) as Id<"products">[];
  const comparisonData = useQuery(
    api.compare.compareProducts,
    isPremium && productIds.length >= 2
      ? { productIds }
      : "skip"
  );

  const canCompare = selectedProducts.length >= 2;

  return (
    <div className="min-h-screen bg-[var(--surface)] pb-24">
      <NavBar
        isPremium={isPremium}
        daysRemaining={daysRemaining}
        subscriptionStatus={subStatus}
        isAdmin={isAdmin ?? false}
      />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <h1
          className="text-2xl font-semibold text-[var(--ink)]"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Compare Products
        </h1>

        {/* Product selector */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          {selectedProducts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedProducts.map((p) => (
                <ProductChip
                  key={p.id}
                  name={p.name}
                  emoji={p.emoji}
                  onRemove={() =>
                    setSelectedProducts((prev) => prev.filter((x) => x.id !== p.id))
                  }
                />
              ))}
            </div>
          )}

          <ProductSelector
            selectedIds={selectedProducts.map((p) => p.id)}
            onAdd={(product) => {
              if (selectedProducts.length < 4) {
                setSelectedProducts((prev) => [...prev, product]);
              }
            }}
            onRemove={(id) =>
              setSelectedProducts((prev) => prev.filter((p) => p.id !== id))
            }
            maxProducts={4}
          />

          <p className="text-xs text-[var(--ink-4)]">
            {selectedProducts.length}/4 products selected — minimum 2 to compare
          </p>
        </div>

        {/* Comparison content */}
        {canCompare && (
          <>
            {isPremium ? (
              comparisonData ? (
                <ComparisonGrid items={comparisonData as Parameters<typeof ComparisonGrid>[0]["items"]} />
              ) : (
                <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
                  <span className="text-sm text-[var(--ink-3)]">Loading comparison…</span>
                </div>
              )
            ) : (
              <ComparisonTeaser
                products={selectedProducts}
                isGuest={isGuest}
              />
            )}
          </>
        )}

        {!canCompare && selectedProducts.length === 1 && (
          <p className="text-sm text-[var(--ink-3)] text-center py-4">
            Add at least one more product to compare
          </p>
        )}
      </main>
    </div>
  );
}
