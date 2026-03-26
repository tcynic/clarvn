"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { ProductCard } from "@/components/ui/ProductCard";
import { LockedProductCard } from "@/components/home/LockedProductCard";

interface ExploreResultsGridProps {
  products: Doc<"products">[];
  cappedForFree: boolean;
  totalCount: number;
  isLoading: boolean;
  pantrySet: Set<string>;
  isAuthenticated: boolean;
  onLoadMore: () => void;
  isDone: boolean;
}

function SkeletonCard() {
  return <div className="product-card animate-pulse bg-[var(--surface-2)]" />;
}

export function ExploreResultsGrid({
  products,
  cappedForFree,
  totalCount,
  isLoading,
  pantrySet,
  isAuthenticated,
  onLoadMore,
  isDone,
}: ExploreResultsGridProps) {
  const router = useRouter();
  const addToPantry = useMutation(api.pantry.addToPantry);
  const removeFromPantry = useMutation(api.pantry.removeFromPantry);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!isLoading && products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--ink-3)] text-sm">No products match these filters.</p>
        <p className="text-xs text-[var(--ink-4)] mt-1">Try removing some filters.</p>
      </div>
    );
  }

  const extraCount = cappedForFree ? Math.max(0, totalCount - products.length) : 0;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {products.map((product) => (
          <ProductCard
            key={product._id}
            name={product.name}
            brand={product.brand}
            emoji={product.emoji}
            imageUrl={product.imageUrl}
            baseScore={product.baseScore}
            tier={product.tier as "Clean" | "Watch" | "Caution" | "Avoid" | undefined}
            price={product.price}
            averageRating={product.averageRating}
            inPantry={pantrySet.has(product._id as string)}
            onSelect={() => router.push(`/product/${product._id}`)}
            onTogglePantry={
              isAuthenticated
                ? () => {
                    if (pantrySet.has(product._id as string)) {
                      removeFromPantry({ productId: product._id as Id<"products"> });
                    } else {
                      addToPantry({ productId: product._id as Id<"products"> });
                    }
                  }
                : undefined
            }
          />
        ))}

        {cappedForFree && (
          <LockedProductCard extraCount={extraCount > 0 ? extraCount : undefined} />
        )}
      </div>

      {!cappedForFree && !isDone && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            className="px-5 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
