"use client";

import { useState } from "react";
import Link from "next/link";
import { Doc } from "../../../convex/_generated/dataModel";
import { GATE_COPY } from "@/lib/gateConstants";

const SCORE_DELTA_THRESHOLD = 8; // Gate 4 fires when |personalScore - baseScore| >= this

type Tier = "Clean" | "Watch" | "Caution" | "Avoid";

const TIER_DOT: Record<Tier, string> = {
  Clean:   "bg-[var(--tier-clean)]",
  Watch:   "bg-[var(--tier-watch)]",
  Caution: "bg-[var(--tier-caution)]",
  Avoid:   "bg-[var(--tier-avoid)]",
};

const TIER_SEGMENT: Record<Tier, string> = {
  Clean:   "bg-[var(--tier-clean)]",
  Watch:   "bg-[var(--tier-watch)]",
  Caution: "bg-[var(--tier-caution)]",
  Avoid:   "bg-[var(--tier-avoid)]",
};

interface IngredientSafetyBarProps {
  ingredients: Array<Doc<"ingredients"> | null>;
}

function IngredientSafetyBar({ ingredients }: IngredientSafetyBarProps) {
  const counts: Record<Tier, number> = { Clean: 0, Watch: 0, Caution: 0, Avoid: 0 };
  for (const ing of ingredients) {
    if (ing?.tier && ing.tier in counts) counts[ing.tier as Tier]++;
  }
  const total = ingredients.length;
  if (total === 0) return null;

  const tiers: Tier[] = ["Clean", "Watch", "Caution", "Avoid"];
  return (
    <div className="mb-5">
      <div className="flex rounded-full overflow-hidden h-2 gap-px bg-[var(--surface-2)]">
        {tiers.map((tier) => {
          const pct = (counts[tier] / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={tier}
              className={`${TIER_SEGMENT[tier]} h-full`}
              style={{ width: `${pct}%` }}
              title={`${tier}: ${counts[tier]}`}
            />
          );
        })}
      </div>
      <div className="flex gap-4 mt-1.5">
        {tiers.map((tier) => (
          counts[tier] > 0 && (
            <span key={tier} className="flex items-center gap-1 text-xs text-[var(--ink-4)]">
              <span className={`w-2 h-2 rounded-full ${TIER_DOT[tier]}`} />
              {counts[tier]} {tier}
            </span>
          )
        ))}
      </div>
    </div>
  );
}

interface IngredientRowProps {
  ingredient: Doc<"ingredients">;
  modifierConditions: string[];
  userConditions: Set<string>;
  isPremium: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
}

function IngredientRow({
  ingredient,
  modifierConditions,
  userConditions,
  isPremium,
  isAuthenticated,
  isGuest,
}: IngredientRowProps) {
  const [expanded, setExpanded] = useState(false);
  const tier = (ingredient.tier ?? "Watch") as Tier;

  const flaggedConditions = modifierConditions.filter((c) =>
    userConditions.has(c.toLowerCase())
  );

  // Free users always see summary only (2 lines). Profile notes are premium.
  const showFullDetail = isPremium;

  // Summarised explanation: first 2 lines (up to first period)
  function summarise(text: string): string {
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
    return sentences.slice(0, 2).join(" ").trim();
  }

  return (
    <div className="border-b border-[var(--surface-2)] last:border-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 py-3 text-left hover:bg-[var(--surface)] rounded-lg px-2 -mx-2 transition-colors"
        aria-expanded={expanded}
      >
        {/* Safety dot */}
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${TIER_DOT[tier]}`} />

        {/* Name */}
        <span className="flex-1 text-sm text-[var(--ink-2)] font-medium">
          {ingredient.canonicalName}
        </span>

        {/* Function badge */}
        {ingredient.ingredientFunction && (
          <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-xs text-[var(--ink-3)]">
            {ingredient.ingredientFunction}
          </span>
        )}

        {/* Score */}
        {ingredient.baseScore !== undefined && (
          <span className="text-xs font-semibold text-[var(--ink-3)] w-8 text-right shrink-0">
            {ingredient.baseScore.toFixed(1)}
          </span>
        )}

        {/* Profile flag indicator */}
        {flaggedConditions.length > 0 && (
          <span className="w-4 h-4 rounded-full bg-[var(--tier-caution)] flex items-center justify-center shrink-0">
            <span className="text-white text-[9px] font-bold">!</span>
          </span>
        )}

        {/* Chevron */}
        <span
          className={`text-[var(--ink-4)] text-xs transition-transform duration-150 shrink-0 ${
            expanded ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {expanded && (
        <div className="px-2 pb-3 space-y-2">
          {ingredient.detailExplanation ? (
            <p className="text-sm text-[var(--ink-3)] leading-relaxed">
              {showFullDetail
                ? ingredient.detailExplanation
                : summarise(ingredient.detailExplanation)}
            </p>
          ) : (
            <p className="text-sm text-[var(--ink-4)] italic">No detail available.</p>
          )}

          {/* Full detail: profile-specific notes (premium only) */}
          {showFullDetail && flaggedConditions.length > 0 && (
            <div className="callout amber text-xs">
              Flagged for your{" "}
              {flaggedConditions
                .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
                .join(", ")}{" "}
              profile.
            </div>
          )}

          {/* Summary-only upgrade prompt for free/guest users */}
          {!showFullDetail && ingredient.detailExplanation && (
            <div className="flex items-center gap-2 mt-1">
              {isGuest ? (
                <Link
                  href="/login"
                  className="text-xs text-[var(--teal-dark)] underline font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  Sign up to see full assessment + profile notes
                </Link>
              ) : (
                <Link
                  href="/upgrade"
                  className="text-xs text-[var(--teal-dark)] underline font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  Upgrade for full assessment + profile notes
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface IngredientListProps {
  ingredients: Array<Doc<"ingredients"> | null>;
  modifiers: Array<{ ingredientId: string; condition: string; status: string }>;
  userConditions: Set<string>;
  isPremium?: boolean;
  isAuthenticated?: boolean;
  isGuest?: boolean;
  /** Product base score (0–10) for Gate 4 delta check */
  baseScore?: number;
  /** User's personalised score (0–10) for Gate 4 delta check */
  personalScore?: number;
  /** Called when a score delta >= threshold is detected (marks session state) */
  onScoreDeltaDetected?: () => void;
}

export function IngredientList({
  ingredients,
  modifiers,
  userConditions,
  isPremium = false,
  isAuthenticated = false,
  isGuest = false,
  baseScore,
  personalScore,
  onScoreDeltaDetected,
}: IngredientListProps) {
  const scored = ingredients.filter(Boolean) as Doc<"ingredients">[];

  // Build a map: ingredientId → condition[]
  const modifierMap: Record<string, string[]> = {};
  for (const mod of modifiers) {
    if (mod.status !== "active") continue;
    if (!modifierMap[mod.ingredientId]) modifierMap[mod.ingredientId] = [];
    modifierMap[mod.ingredientId].push(mod.condition);
  }

  // Gate 4: compute score delta (base → personal)
  const scoreDelta =
    baseScore !== undefined && personalScore !== undefined
      ? Math.abs(personalScore - baseScore)
      : 0;

  // Notify parent when we detect a meaningful delta (so it can mark sessionStorage)
  if (scoreDelta > 0 && onScoreDeltaDetected) {
    onScoreDeltaDetected();
  }

  // Gate 4 fires inline when: delta ≥ threshold AND not premium
  const showGate4 = !isPremium && scoreDelta >= SCORE_DELTA_THRESHOLD;

  // First flagged condition (for personalised gate 4 copy)
  const flaggedConditionForGate = Array.from(userConditions)[0];
  const flaggedIngredients = scored.filter((ing) =>
    (modifierMap[ing._id] ?? []).some((c) => userConditions.has(c.toLowerCase()))
  );
  const gate4Ingredient = flaggedIngredients[0];

  return (
    <section
      id="ingredient-list"
      className="bg-white rounded-2xl shadow-sm p-6"
      data-testid="ingredient-list"
    >
      <h2
        className="text-lg font-bold text-[var(--ink)] mb-4"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Ingredients
        <span className="ml-2 text-sm font-normal text-[var(--ink-4)]">
          ({scored.length})
        </span>
      </h2>

      <IngredientSafetyBar ingredients={ingredients} />

      {/* Gate 4 inline lock: score delta ≥ 8 and not premium */}
      {showGate4 && (
        <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-sm font-semibold text-[var(--ink)] mb-1">
            Your personalised score differs by {scoreDelta.toFixed(1)} points
          </p>
          <p className="text-xs text-[var(--ink-3)] mb-3 leading-relaxed">
            {gate4Ingredient && flaggedConditionForGate
              ? GATE_COPY.ingredientDetail(gate4Ingredient.canonicalName, flaggedConditionForGate)
              : GATE_COPY.ingredientDetailGeneric(gate4Ingredient?.canonicalName ?? "this ingredient")}
          </p>
          {isGuest ? (
            <Link href="/login" className="text-xs font-semibold text-[var(--teal)] underline">
              Create a free account to see your profile notes
            </Link>
          ) : (
            <Link href="/upgrade" className="text-xs font-semibold text-[var(--teal)] underline">
              Upgrade to see full profile notes
            </Link>
          )}
        </div>
      )}

      <div>
        {scored.map((ing) => (
          <IngredientRow
            key={ing._id}
            ingredient={ing}
            modifierConditions={modifierMap[ing._id] ?? []}
            userConditions={userConditions}
            isPremium={isPremium}
            isAuthenticated={isAuthenticated}
            isGuest={isGuest}
          />
        ))}
        {scored.length === 0 && (
          <p className="text-sm text-[var(--ink-4)] text-center py-4">
            No ingredient data available yet.
          </p>
        )}
      </div>
    </section>
  );
}
