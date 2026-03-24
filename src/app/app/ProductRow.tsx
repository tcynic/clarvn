"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { TierBadge } from "../../components/TierBadge";
import { ScorePill } from "./ScorePill";

type Tier = "Clean" | "Watch" | "Caution" | "Avoid";

interface ListItem {
  name: string;
  requestSent: boolean;
}

/**
 * v3 ProductRow — uses getPersonalizedProduct for server-side personalization.
 * Single reactive query replaces product + ingredients + modifiers.
 */
export function ProductRow({
  item,
  isSelected,
  onSelect,
  onRequest,
}: {
  item: ListItem;
  isSelected: boolean;
  onSelect: () => void;
  onRequest: () => void;
}) {
  const product = useQuery(api.products.getProduct, { name: item.name });
  const personalized = useQuery(
    api.assembly.getPersonalizedProduct,
    product ? { productId: product._id } : "skip"
  );

  if (product === undefined) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white">
        <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] animate-pulse shrink-0" />
        <div className="flex-1">
          <div className="h-3 bg-[var(--surface-2)] rounded w-40 animate-pulse" />
        </div>
      </div>
    );
  }

  if (product === null) {
    return (
      <div
        className={`flex items-center justify-between px-4 py-3 rounded-[var(--radius-lg)] border transition-colors ${
          isSelected ? "border-[var(--teal)] bg-[var(--teal-light)]" : "border-[var(--border)] bg-white"
        }`}
      >
        <div>
          <p className="text-sm font-medium text-[var(--ink)]">{item.name}</p>
          <p className="text-xs text-[var(--ink-3)]">Not yet scored</p>
        </div>
        {item.requestSent ? (
          <span className="b-teal">Requested ✓</span>
        ) : (
          <button
            onClick={onRequest}
            className="text-xs bg-[var(--surface-2)] text-[var(--ink-2)] font-medium px-3 py-1.5 rounded-[var(--radius)] hover:bg-[var(--surface-3)] transition-colors"
          >
            Request
          </button>
        )}
      </div>
    );
  }

  // Pending ingredients — no score yet
  if (
    personalized?.assemblyStatus === "pending_ingredients" &&
    personalized.baseScore === 0
  ) {
    return (
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] border transition-colors ${
          isSelected ? "border-[var(--teal)] bg-[var(--teal-light)]" : "border-[var(--border)] bg-white"
        }`}
      >
        <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] flex items-center justify-center shrink-0">
          <span className="text-xs text-[var(--ink-3)]">…</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--ink)] truncate">
            {product.emoji} {product.name}
          </p>
          <p className="text-xs text-[var(--ink-3)]">
            Scoring in progress
            {personalized.pendingCount > 0
              ? ` — ${personalized.pendingCount} ingredients pending`
              : ""}
          </p>
        </div>
      </div>
    );
  }

  const displayScore = personalized?.personalScore ?? personalized?.baseScore ?? product.baseScore ?? 0;
  const displayTier = (personalized?.personalTier ?? personalized?.tier ?? product.tier ?? "Clean") as Tier;
  const baseScore = personalized?.baseScore ?? product.baseScore ?? 0;
  const hasModifiers = personalized && personalized.modifiers.length > 0;
  const isPartial = personalized?.assemblyStatus === "partial";

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] border text-left transition-colors ${
        isSelected ? "border-[var(--teal)] bg-[var(--teal-light)]" : "border-[var(--border)] bg-white hover:bg-[var(--surface)]"
      }`}
    >
      <ScorePill score={displayScore} tier={displayTier} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-medium text-[var(--ink)] truncate">
            {product.emoji} {product.name}
          </p>
          <TierBadge tier={displayTier} />
          {isPartial && (
            <span className="text-xs text-[var(--ink-4)] italic">partial</span>
          )}
        </div>
        <p className="text-xs text-[var(--ink-3)]">{product.brand}</p>
        {hasModifiers && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {personalized!.modifiers.map((m, i) => (
              <span key={i} className="text-xs text-[var(--tier-caution)]">
                +{m.modifierAmount} {m.condition}
              </span>
            ))}
          </div>
        )}
      </div>
      {hasModifiers && (
        <span className="text-xs line-through text-[var(--ink-4)] shrink-0">
          {baseScore.toFixed(1)}
        </span>
      )}
    </button>
  );
}
