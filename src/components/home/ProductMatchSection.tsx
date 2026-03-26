"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { ProductCard } from "@/components/ui/ProductCard";
import { LockedProductCard } from "./LockedProductCard";
import type { UserProfile } from "@/lib/personalScore";

interface RecommendationItem {
  product: Doc<"products">;
  matchPercentage: number;
  personalScore: number;
  tier: string;
}

interface ProductMatchSectionProps {
  isAuthenticated: boolean;
  isPremium: boolean;
  profileOverride?: Pick<UserProfile, "conditions" | "sensitivities" | "dietaryRestrictions" | "ingredientsToAvoid"> | null;
  conditionCount: number;
}

export function ProductMatchSection({
  isAuthenticated,
  isPremium,
  profileOverride,
  conditionCount,
}: ProductMatchSectionProps) {
  const router = useRouter();
  const FREE_LIMIT = 3;
  const limit = isPremium ? 8 : FREE_LIMIT;

  const pantryProductIds = useQuery(
    api.pantry.getMyPantryProductIds,
    isAuthenticated ? {} : "skip"
  );
  const addToPantry = useMutation(api.pantry.addToPantry);
  const removeFromPantry = useMutation(api.pantry.removeFromPantry);

  const pantrySet = new Set<string>(
    (pantryProductIds ?? []).map((id) => id as string)
  );

  const recommendations = useQuery(
    api.recommendations.getRecommendedProducts,
    profileOverride || isAuthenticated
      ? {
          limit,
          profileOverride: profileOverride
            ? {
                conditions: profileOverride.conditions ?? [],
                sensitivities: profileOverride.sensitivities ?? [],
                dietaryRestrictions: profileOverride.dietaryRestrictions,
                ingredientsToAvoid: profileOverride.ingredientsToAvoid,
              }
            : undefined,
        }
      : "skip"
  );

  if (!recommendations) {
    return (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-[var(--ink)]">
            Products that match you
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="product-card animate-pulse bg-[var(--surface-2)]"
            />
          ))}
        </div>
      </section>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--ink)]">
            Products that match you
          </h2>
          {conditionCount > 0 && (
            <p className="text-xs text-[var(--ink-3)]">
              Curated for your {conditionCount} condition
              {conditionCount === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <Link
          href="/explore?mode=matches"
          className="text-xs font-medium text-[var(--teal-dark)] hover:text-[var(--teal)] transition-colors"
        >
          See all →
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {(recommendations as RecommendationItem[]).map(({ product, matchPercentage, personalScore, tier }) => (
          <ProductCard
            key={product._id}
            name={product.name}
            brand={product.brand}
            emoji={product.emoji}
            imageUrl={product.imageUrl}
            baseScore={personalScore}
            tier={tier as "Clean" | "Watch" | "Caution" | "Avoid"}
            price={product.price}
            matchPercentage={matchPercentage}
            onSelect={() => router.push(`/product/${product._id}`)}
            inPantry={pantrySet.has(product._id as string)}
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

        {/* Lock card for free users */}
        {!isPremium && (
          <LockedProductCard extraCount={5} />
        )}
      </div>
    </section>
  );
}
