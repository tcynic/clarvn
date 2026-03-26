"use client";

import Link from "next/link";

type Tier = "Clean" | "Watch" | "Caution" | "Avoid";

const TIER_CLASS: Record<Tier, string> = {
  Clean:   "b-clean",
  Watch:   "b-watch",
  Caution: "b-caution",
  Avoid:   "b-avoid",
};

interface ComparisonProduct {
  product: {
    _id: string;
    name: string;
    brand: string;
    emoji?: string;
    imageUrl?: string;
    baseScore?: number;
    tier?: string;
    size?: string;
    price?: number;
  };
  ingredientCount: number;
  flaggedCount: number;
  claimLabels: string[];
}

interface ComparisonGridProps {
  items: ComparisonProduct[];
}

export function ComparisonGrid({ items }: ComparisonGridProps) {
  // Collect all unique claims across all products
  const allClaims = Array.from(
    new Set(items.flatMap((item) => item.claimLabels))
  ).sort();

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--surface-2)]">
            <th className="text-left p-4 text-xs font-semibold text-[var(--ink-4)] uppercase tracking-wide w-36">
              Product
            </th>
            {items.map((item) => (
              <th key={item.product._id} className="p-4 text-center min-w-[140px]">
                <Link href={`/product/${item.product._id}`} className="group">
                  <div className="w-12 h-12 rounded-xl bg-[var(--surface)] flex items-center justify-center mx-auto mb-2 overflow-hidden">
                    {item.product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">{item.product.emoji ?? "🛒"}</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--ink-4)]">{item.product.brand}</p>
                  <p className="text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--teal-dark)] leading-snug line-clamp-2">
                    {item.product.name}
                  </p>
                </Link>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Score */}
          <tr className="border-b border-[var(--surface-2)] bg-[var(--surface)]">
            <td className="p-4 text-xs font-semibold text-[var(--ink-4)] uppercase tracking-wide">
              Score
            </td>
            {items.map((item) => {
              const tier = item.product.tier as Tier | undefined;
              return (
                <td key={item.product._id} className="p-4 text-center">
                  {item.product.baseScore !== undefined && tier ? (
                    <span className={`${TIER_CLASS[tier]} text-sm font-bold`}>
                      {item.product.baseScore.toFixed(1)} · {tier}
                    </span>
                  ) : (
                    <span className="text-[var(--ink-4)]">—</span>
                  )}
                </td>
              );
            })}
          </tr>

          {/* Ingredient count */}
          <tr className="border-b border-[var(--surface-2)]">
            <td className="p-4 text-xs font-semibold text-[var(--ink-4)] uppercase tracking-wide">
              Ingredients
            </td>
            {items.map((item) => (
              <td key={item.product._id} className="p-4 text-center text-[var(--ink-2)] font-medium">
                {item.ingredientCount}
              </td>
            ))}
          </tr>

          {/* Flagged count */}
          <tr className="border-b border-[var(--surface-2)] bg-[var(--surface)]">
            <td className="p-4 text-xs font-semibold text-[var(--ink-4)] uppercase tracking-wide">
              Flagged
            </td>
            {items.map((item) => (
              <td key={item.product._id} className="p-4 text-center">
                <span
                  className={
                    item.flaggedCount > 0
                      ? "text-[var(--tier-caution)] font-semibold"
                      : "text-[var(--tier-clean)] font-semibold"
                  }
                >
                  {item.flaggedCount > 0 ? `${item.flaggedCount} ⚠` : "0 ✓"}
                </span>
              </td>
            ))}
          </tr>

          {/* Price */}
          <tr className="border-b border-[var(--surface-2)]">
            <td className="p-4 text-xs font-semibold text-[var(--ink-4)] uppercase tracking-wide">
              Price
            </td>
            {items.map((item) => (
              <td key={item.product._id} className="p-4 text-center text-[var(--ink-2)]">
                {item.product.price !== undefined
                  ? `$${item.product.price.toFixed(2)}`
                  : "—"}
              </td>
            ))}
          </tr>

          {/* Claims */}
          {allClaims.length > 0 && (
            <tr className="border-b border-[var(--surface-2)] bg-[var(--surface)]">
              <td
                className="p-4 text-xs font-semibold text-[var(--ink-4)] uppercase tracking-wide"
                colSpan={items.length + 1}
              >
                Claims &amp; Certifications
              </td>
            </tr>
          )}
          {allClaims.map((claim, i) => (
            <tr
              key={claim}
              className={`border-b border-[var(--surface-2)] ${i % 2 === 0 ? "" : "bg-[var(--surface)]"}`}
            >
              <td className="p-4 text-xs text-[var(--ink-3)] capitalize">
                {claim.replace(/_/g, " ")}
              </td>
              {items.map((item) => (
                <td key={item.product._id} className="p-4 text-center">
                  {item.claimLabels.includes(claim) ? (
                    <span className="text-[var(--tier-clean)] text-base">✓</span>
                  ) : (
                    <span className="text-[var(--surface-3)] text-base">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
