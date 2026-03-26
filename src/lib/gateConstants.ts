/**
 * Gate copy strings for the six premium upgrade moments.
 * All copy follows the formula: [specific thing they'll get] — [why it's specific to them].
 * Generic "Upgrade to Premium" copy is the failure mode — every message must be contextual.
 */

export const GATE_COPY = {
  /** Gate 1 — Explore overflow */
  exploreOverflow: (shown: number, total: number) =>
    `Showing ${shown} of ${total} results. Premium shows all ${total} sorted by your match % threshold.`,

  /** Gate 1 — Home "For You" overflow */
  homeOverflow: (shown: number, total: number) =>
    `Showing ${shown} of ${total} matches for your profile. Go Premium to see all ${total}.`,

  /** Gate 2 — Comparison modal (copy for below the lock) */
  comparison: (product1: string, product2: string) =>
    `Compare ${product1} vs ${product2} — scores, match %, flagged ingredients, and certifications.`,

  /** Gate 3 — Premium filter inline message */
  premiumFilter: (filterName: string, otherCount: number) =>
    `${filterName} filter is Premium. Upgrade to filter by match %, allergen-free, price range, and ${otherCount} more.`,

  /** Gate 4 — Ingredient detail panel lock */
  ingredientDetail: (ingredientName: string, conditionName: string) =>
    `${ingredientName} is flagged for your ${conditionName} profile. See exactly how this affects your score and what to watch for.`,

  /** Gate 4 — Ingredient detail when no specific condition (generic fallback) */
  ingredientDetailGeneric: (ingredientName: string) =>
    `Unlock the full safety assessment and profile-specific notes for ${ingredientName}.`,

  /** Gate 5 — Pantry limit inline banner */
  pantryFull: (limit: number) =>
    `Your pantry is full (${limit}/${limit}). Premium gives you unlimited products and a live health score across everything you track.`,

  /** Gate 6 — Pantry health score teaser CTA */
  pantryHealthScore: "Unlock your pantry health score.",

  /** Guest prompt — used everywhere guests would see a premium gate instead */
  guestSignup:
    "Create a free account to save your profile and start your 14-day Premium trial.",
} as const;

/** How many premium filters exist (used for Gate 3 "and N more" copy) */
export const PREMIUM_FILTER_COUNT = 6;
