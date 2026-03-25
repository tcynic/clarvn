"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { TierBadge } from "../../components/TierBadge";

type Tier = "Clean" | "Watch" | "Caution" | "Avoid";

/**
 * v3 ProductDetail — uses getPersonalizedProduct for ingredient breakdown,
 * worst ingredient highlighting, modifier detail, and pending states.
 */
export function ProductDetail({
  name,
  onClose,
  onSwap,
}: {
  name: string;
  onClose: () => void;
  onSwap: (newName: string) => void;
}) {
  const product = useQuery(api.products.getProduct, { name });
  const personalized = useQuery(
    api.assembly.getPersonalizedProduct,
    product ? { productId: product._id } : "skip"
  );
  const alternatives = useQuery(
    api.scoringQueue.getAlternativesForProduct,
    product ? { productId: product._id } : "skip"
  );

  if (!product || !personalized) return null;

  const displayScore = personalized.personalScore;
  const displayTier = personalized.personalTier as Tier;
  const baseScore = personalized.baseScore;

  return (
    <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--border)] p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-semibold text-[var(--ink)] text-sm">
            {product.emoji} {product.name}
          </h2>
          <p className="text-xs text-[var(--ink-3)]">{product.brand}</p>
        </div>
        <button onClick={onClose} className="text-[var(--ink-3)] hover:text-[var(--ink)] text-xl leading-none">×</button>
      </div>

      {/* Score display */}
      <div className="flex items-center gap-4 mb-5">
        <div className="flex flex-col items-center">
          {personalized.personalScore !== personalized.baseScore && (
            <span className="text-xs line-through text-[var(--ink-4)]">{baseScore.toFixed(1)}</span>
          )}
          <span
            className="text-4xl font-bold"
            style={{ fontFamily: "var(--font-serif)", color: `var(--tier-${displayTier.toLowerCase()})` }}
          >
            {displayScore.toFixed(1)}
          </span>
          <TierBadge tier={displayTier} />
        </div>
        <div className="text-xs text-[var(--ink-3)]">
          <p>v{product.scoreVersion}</p>
          {personalized.assemblyStatus === "partial" && (
            <p className="text-[var(--tier-watch)]">Partial score — {personalized.pendingCount} pending</p>
          )}
          <p className="mt-0.5">AI-generated</p>
        </div>
      </div>

      {/* Profile modifiers */}
      {personalized.modifiers.length > 0 && (
        <div className="mb-4 p-3 bg-[var(--tier-caution-light)] rounded-[var(--radius)]">
          <p className="text-xs font-semibold text-[var(--tier-caution)] uppercase tracking-wide mb-1.5">Your Profile</p>
          {personalized.modifiers.map((m, i) => (
            <div key={i} className="text-xs text-[var(--tier-caution)] mb-0.5">
              +{m.modifierAmount} {m.condition} · {m.evidenceCitation.split(" ").slice(0, 5).join(" ")}…
            </div>
          ))}
        </div>
      )}

      {/* Ingredients — sorted worst first, worst highlighted */}
      {personalized.ingredients.length > 0 && (
        <div className="border-t border-[var(--border)] pt-4">
          <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-2">Ingredients</p>
          <ul className="flex flex-col gap-1">
            {personalized.ingredients.map((ing) => {
              const isWorst = personalized.worstIngredientId === ing._id;
              return (
                <li key={ing._id} className={`flex items-center justify-between text-xs py-0.5 ${isWorst ? "font-semibold" : ""}`}>
                  <span className={isWorst ? "text-[var(--tier-avoid)]" : "text-[var(--ink-2)]"}>
                    {ing.canonicalName}
                    {isWorst && <span className="ml-1 text-[var(--tier-avoid)]">· Primary concern</span>}
                    {ing.flagLabel && !isWorst && <span className="text-[var(--ink-4)] ml-1">· {ing.flagLabel}</span>}
                  </span>
                  <TierBadge tier={ing.tier as Tier} />
                </li>
              );
            })}
          </ul>
          {/* Pending ingredients */}
          {personalized.pendingIngredients.length > 0 && (
            <div className="mt-2">
              {personalized.pendingIngredients.map((ing) => (
                <div key={ing._id} className="flex items-center justify-between text-xs py-0.5 text-[var(--ink-4)]">
                  <span className="italic">{ing.canonicalName}</span>
                  <span className="text-xs">Pending</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alternatives */}
      {alternatives && alternatives.length > 0 && (
        <div className="border-t border-[var(--border)] pt-4 mt-1">
          <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-2">Alternatives</p>
          <ul className="flex flex-col gap-2">
            {(alternatives as any[]).map((alt) => {
              const altTier = (alt.tier ?? "Clean") as Tier;
              return (
                <li key={alt._id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="text-sm font-bold shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white"
                      style={{ background: `var(--tier-${altTier.toLowerCase()})`, fontFamily: "var(--font-serif)" }}
                    >
                      {alt.baseScore != null ? alt.baseScore.toFixed(1) : "—"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--ink)] truncate">
                        {alt.emoji} {alt.name}
                      </p>
                      <TierBadge tier={altTier} />
                    </div>
                  </div>
                  <button
                    onClick={() => onSwap(alt.name)}
                    className="text-xs bg-[var(--teal-light)] text-[var(--teal-dark)] font-medium px-3 py-1.5 rounded-[var(--radius)] hover:bg-[var(--teal-pale)] transition-colors shrink-0"
                  >
                    Swap
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
