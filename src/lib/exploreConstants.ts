export const CATEGORY_OPTIONS = [
  { label: "All",            value: null,             subcategory: null },
  { label: "Pantry staples", value: "pantry_staples", subcategory: null },
  { label: "Snacks",         value: "snacks",         subcategory: null },
  { label: "Dairy",          value: "dairy",          subcategory: null },
  { label: "Condiments",     value: "pantry_staples", subcategory: "condiment" },
  { label: "Baby & Kids",    value: "baby_kids",      subcategory: null },
  { label: "Beverages",      value: "beverages",      subcategory: null },
  { label: "Frozen",         value: "frozen",         subcategory: null },
] as const;

// Per paywall strategy: all free-from claims are premium.
// Free filters: score range (tier) and certifications.
export const FREE_FROM_OPTIONS = [
  { label: "Gluten-free",     claim: "gluten_free",        premium: true },
  { label: "Dairy-free",      claim: "dairy_free",         premium: true },
  { label: "Nut-free",        claim: "nut_free",           premium: true },
  { label: "Soy-free",        claim: "soy_free",           premium: true },
  { label: "Artificial dyes", claim: "no_artificial_colors", premium: true },
  { label: "Added sugars",    claim: "no_added_sugar",     premium: true },
  { label: "Preservatives",   claim: "no_preservatives",   premium: true },
] as const;

// Certifications are free filters.
export const CERTIFICATION_OPTIONS = [
  { label: "USDA Organic", claim: "usda_organic", premium: false },
  { label: "Non-GMO",      claim: "non_gmo",      premium: false },
  { label: "Kosher",       claim: "kosher",        premium: false },
  { label: "Vegan",        claim: "vegan",         premium: false },
] as const;

// Price range is a premium filter.
export const PRICE_RANGE_OPTIONS = [
  { label: "Under $5", value: "under_5" },
  { label: "$5–$15",   value: "5_to_15" },
  { label: "Over $15", value: "over_15" },
] as const;

export const SORT_OPTIONS = [
  { label: "Best match",     value: "best_match" },
  { label: "Highest score",  value: "highest_score" },
  { label: "Most reviewed",  value: "most_reviewed" },
  { label: "Price low→high", value: "price_asc" },
] as const;

export type SortValue = "best_match" | "highest_score" | "most_reviewed" | "price_asc";
export type PriceRangeValue = "under_5" | "5_to_15" | "over_15";
export type TierFilter = "Clean" | "Watch" | "Caution";

export interface ExploreFilters {
  category: string | null;
  subcategory: string | null;
  claims: string[];
  tier: TierFilter | null;
  priceRange: PriceRangeValue | null;
  sort: SortValue;
}

export const DEFAULT_FILTERS: ExploreFilters = {
  category: null,
  subcategory: null,
  claims: [],
  tier: null,
  priceRange: null,
  sort: "best_match",
};
