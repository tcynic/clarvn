"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { NavBar } from "@/components/ui/NavBar";

type Tier = "Clean" | "Watch" | "Caution" | "Avoid";

const TIER_PILL: Record<Tier, string> = {
  Clean:   "score-pill-clean",
  Watch:   "score-pill-watch",
  Caution: "score-pill-caution",
  Avoid:   "score-pill-avoid",
};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useConvexAuth();

  const product = useQuery(api.products.getProductById, { id: id as Id<"products"> });
  const inPantry = useQuery(
    api.pantry.isInPantry,
    isAuthenticated ? { productId: id as Id<"products"> } : "skip"
  );

  const addToPantry = useMutation(api.pantry.addToPantry);
  const removeFromPantry = useMutation(api.pantry.removeFromPantry);

  if (product === undefined) {
    return (
      <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center">
        <span className="text-sm text-[var(--ink-3)]">Loading…</span>
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="min-h-screen bg-[var(--surface)]">
        <NavBar />
        <main className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="text-xl font-semibold text-[var(--ink)] mb-2">Product not found</h1>
          <Link href="/home" className="text-sm text-[var(--teal-dark)] hover:text-[var(--teal)]">
            ← Back to Home
          </Link>
        </main>
      </div>
    );
  }

  const tier = product.tier as Tier | undefined;

  return (
    <div className="min-h-screen bg-[var(--surface)] pb-24">
      <NavBar />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Back link */}
        <Link
          href="/home"
          className="inline-flex items-center gap-1 text-sm text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
        >
          ← Back to Home
        </Link>

        {/* Product hero */}
        <div className="bg-white rounded-2xl shadow-sm p-6 flex gap-6">
          {/* Image / emoji */}
          <div className="w-24 h-24 rounded-xl bg-[var(--surface)] flex items-center justify-center shrink-0 overflow-hidden">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-4xl">{product.emoji ?? "🛒"}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-xs text-[var(--ink-4)] uppercase tracking-wide">
              {product.brand}
            </p>
            <h1
              className="text-xl font-semibold text-[var(--ink)] leading-snug"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {product.name}
            </h1>

            {/* Score + tier */}
            {product.baseScore !== undefined && tier && (
              <span
                className={`${TIER_PILL[tier]} inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold`}
              >
                {product.baseScore.toFixed(1)} · {tier}
              </span>
            )}

            {product.price !== undefined && (
              <p className="text-sm text-[var(--ink-3)]">${product.price.toFixed(2)}</p>
            )}
          </div>
        </div>

        {/* Add to pantry CTA */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          {!isAuthenticated ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--ink-3)]">Save this product to your pantry</p>
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg bg-[var(--teal)] text-white text-sm font-semibold hover:bg-[var(--teal-dark)] transition-colors"
              >
                Sign in to save
              </Link>
            </div>
          ) : inPantry ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--ink)]">✓ Added to pantry</p>
                <p className="text-xs text-[var(--ink-3)] mt-0.5">This product is in your pantry</p>
              </div>
              <button
                type="button"
                onClick={() => removeFromPantry({ productId: id as Id<"products"> })}
                className="px-4 py-2 rounded-lg border border-[var(--surface-3)] text-sm text-[var(--ink-3)] hover:border-[var(--tier-avoid)] hover:text-[var(--tier-avoid)] transition-colors"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--ink-3)]">Save this product to track it</p>
              <button
                type="button"
                onClick={() => addToPantry({ productId: id as Id<"products"> })}
                className="px-4 py-2 rounded-lg bg-[var(--teal)] text-white text-sm font-semibold hover:bg-[var(--teal-dark)] transition-colors"
              >
                Add to pantry
              </button>
            </div>
          )}
        </div>

        {/* Stub notice */}
        <p className="text-xs text-center text-[var(--ink-4)]">
          Full ingredient detail coming in a future update.
        </p>
      </main>
    </div>
  );
}
