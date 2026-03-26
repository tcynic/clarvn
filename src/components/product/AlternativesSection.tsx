"use client";

import Link from "next/link";
import { Doc } from "../../../convex/_generated/dataModel";

type Tier = "Clean" | "Watch" | "Caution" | "Avoid";

const TIER_CLASS: Record<Tier, string> = {
  Clean:   "b-clean",
  Watch:   "b-watch",
  Caution: "b-caution",
  Avoid:   "b-avoid",
};

interface AlternativesSectionProps {
  alternatives: Array<Doc<"products"> | null>;
  currentProductTier?: string;
  isPremium?: boolean;
}

export function AlternativesSection({
  alternatives,
  currentProductTier,
  isPremium = false,
}: AlternativesSectionProps) {
  // Only show for non-Clean tier products
  if (currentProductTier === "Clean") return null;

  const alts = (alternatives ?? [])
    .filter(Boolean)
    .slice(0, 3) as Doc<"products">[];

  return (
    <section
      className="bg-white rounded-2xl shadow-sm p-6"
      data-testid="alternatives-section"
    >
      <div className="flex items-center gap-2 mb-4">
        <h2
          className="text-lg font-bold text-[var(--ink)]"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Cleaner alternatives
        </h2>
        {isPremium && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--teal-light)] text-[var(--teal-dark)] font-medium">
            Sorted by your match %
          </span>
        )}
      </div>

      {alts.length === 0 ? (
        <p className="text-sm text-[var(--ink-4)] italic">
          Checking for alternatives&hellip;
        </p>
      ) : (
        <div className="space-y-3">
          {alts.map((alt) => {
            const tier = alt.tier as Tier | undefined;
            return (
              <Link
                key={alt._id}
                href={`/product/${alt._id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface)] transition-colors"
              >
                {/* Emoji / image */}
                <div className="w-10 h-10 rounded-lg bg-[var(--surface)] flex items-center justify-center shrink-0 overflow-hidden">
                  {alt.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={alt.imageUrl}
                      alt={alt.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg">{alt.emoji ?? "🛒"}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--ink-4)] truncate">{alt.brand}</p>
                  <p className="text-sm font-medium text-[var(--ink-2)] truncate">{alt.name}</p>
                </div>

                {/* Score badge */}
                {alt.baseScore !== undefined && tier && (
                  <span className={`${TIER_CLASS[tier]} text-xs font-bold shrink-0`}>
                    {alt.baseScore.toFixed(1)}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
