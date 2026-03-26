"use client";

import Link from "next/link";

type Tier = "Clean" | "Watch" | "Caution" | "Avoid";

const TIER_BG: Record<string, string> = {
  Clean:   "bg-[var(--tier-clean-light)] text-[var(--tier-clean)]",
  Watch:   "bg-[var(--tier-watch-light)] text-[var(--tier-watch)]",
  Caution: "bg-[var(--tier-caution-light)] text-[var(--tier-caution)]",
  Avoid:   "bg-[var(--tier-avoid-light)] text-[var(--tier-avoid)]",
};

interface TeaserProduct {
  id: string;
  name: string;
  brand?: string;
  emoji?: string;
  imageUrl?: string;
  baseScore?: number;
  tier?: string;
}

interface ComparisonTeaserProps {
  products: TeaserProduct[];
  isGuest: boolean;
}

export function ComparisonTeaser({ products, isGuest }: ComparisonTeaserProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      {/* Product thumbnails + scores — visible above lock */}
      <div className="flex items-start gap-4 justify-center mb-6">
        {products.map((product, i) => {
          const tierStyle = product.tier ? TIER_BG[product.tier] ?? "" : "";
          return (
            <div key={product.id} className="flex items-center gap-3">
              {i > 0 && (
                <span className="text-[var(--ink-4)] text-sm font-bold">vs</span>
              )}
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-xl bg-[var(--surface-2)] flex items-center justify-center overflow-hidden">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl">{product.emoji ?? "🛒"}</span>
                  )}
                </div>
                <div className="text-center max-w-[100px]">
                  <p className="text-xs text-[var(--ink-3)]">{product.brand}</p>
                  <p className="text-sm font-semibold text-[var(--ink)] leading-snug">{product.name}</p>
                  {product.baseScore !== undefined && product.tier && (
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tierStyle}`}>
                      {product.baseScore.toFixed(1)} · {product.tier}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lock line */}
      <div className="border-t border-dashed border-[var(--border)] my-4 relative">
        <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-2 text-lg">🔒</span>
      </div>

      {/* Gate copy */}
      <div className="text-center space-y-2 mt-6">
        <p className="text-sm font-semibold text-[var(--ink)]">
          Full side-by-side breakdown — scores, flagged ingredients, match %, and certifications
        </p>
        <p className="text-xs text-[var(--ink-3)]">Compare up to 4 products at once</p>

        {isGuest ? (
          <Link
            href="/login"
            className="inline-block mt-3 px-6 py-2.5 rounded-xl bg-[var(--teal)] text-white text-sm font-semibold hover:bg-[var(--teal-dark)] transition-colors"
          >
            Create free account
          </Link>
        ) : (
          <Link
            href="/upgrade"
            className="inline-block mt-3 px-6 py-2.5 rounded-xl bg-[var(--teal)] text-white text-sm font-semibold hover:bg-[var(--teal-dark)] transition-colors"
          >
            Start free trial to compare
          </Link>
        )}
      </div>
    </div>
  );
}
