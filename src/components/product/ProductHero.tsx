"use client";

import Link from "next/link";
import { Doc } from "../../../convex/_generated/dataModel";

interface ProductHeroProps {
  product: Doc<"products">;
  inPantry: boolean | null | undefined;
  onPantryToggle: () => void;
  isAuthenticated: boolean;
  productId: string;
  /** If provided, called instead of navigating to /compare (used for gate modal) */
  onCompareClick?: () => void;
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => {
        if (i < full) return <span key={i} className="text-amber-400 text-sm">★</span>;
        if (i === full && half) return <span key={i} className="text-amber-300 text-sm">★</span>;
        return <span key={i} className="text-[var(--surface-3)] text-sm">★</span>;
      })}
    </span>
  );
}

export function ProductHero({
  product,
  inPantry,
  onPantryToggle,
  isAuthenticated,
  productId,
  onCompareClick,
}: ProductHeroProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden" data-testid="product-hero">
      {/* Image area */}
      <div className="w-full h-56 bg-[var(--surface)] flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-7xl">{product.emoji ?? "🛒"}</span>
        )}
      </div>

      {/* Info */}
      <div className="p-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ink-4)]">
          {product.brand}
        </p>
        <h1
          className="text-2xl font-bold text-[var(--ink)] leading-snug"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {product.name}
        </h1>

        {/* Rating row */}
        {product.averageRating !== undefined && (
          <div className="flex items-center gap-2">
            <StarRating rating={product.averageRating} />
            <span className="text-sm text-[var(--ink-3)]">
              {product.averageRating.toFixed(1)}
              {product.reviewCount !== undefined && (
                <span className="ml-1 text-[var(--ink-4)]">({product.reviewCount.toLocaleString()})</span>
              )}
            </span>
          </div>
        )}

        {/* Size + price */}
        <div className="flex items-center gap-3 text-sm text-[var(--ink-3)]">
          {product.size && <span>{product.size}</span>}
          {product.price !== undefined && (
            <span className="font-semibold text-[var(--ink-2)]">${product.price.toFixed(2)}</span>
          )}
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-sm text-[var(--ink-3)] leading-relaxed">{product.description}</p>
        )}

        {/* CTA buttons */}
        <div className="flex gap-3 pt-1">
          {!isAuthenticated ? (
            <Link
              href="/login"
              className="flex-1 py-2.5 rounded-xl bg-[var(--teal)] text-white text-sm font-semibold text-center hover:bg-[var(--teal-dark)] transition-colors"
            >
              Sign in to save
            </Link>
          ) : inPantry ? (
            <button
              type="button"
              onClick={onPantryToggle}
              className="flex-1 py-2.5 rounded-xl bg-[var(--teal-light)] text-[var(--teal-dark)] text-sm font-semibold hover:bg-[var(--surface-2)] transition-colors"
            >
              ✓ In pantry
            </button>
          ) : (
            <button
              type="button"
              onClick={onPantryToggle}
              className="flex-1 py-2.5 rounded-xl bg-[var(--teal)] text-white text-sm font-semibold hover:bg-[var(--teal-dark)] transition-colors"
            >
              + Add to pantry
            </button>
          )}
          {onCompareClick ? (
            <button
              type="button"
              onClick={onCompareClick}
              className="px-5 py-2.5 rounded-xl border border-[var(--surface-3)] text-sm font-semibold text-[var(--ink-2)] hover:border-[var(--teal)] hover:text-[var(--teal-dark)] transition-colors"
            >
              Compare
            </button>
          ) : (
            <Link
              href={`/compare?products=${productId}`}
              className="px-5 py-2.5 rounded-xl border border-[var(--surface-3)] text-sm font-semibold text-[var(--ink-2)] hover:border-[var(--teal)] hover:text-[var(--teal-dark)] transition-colors"
            >
              Compare
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
