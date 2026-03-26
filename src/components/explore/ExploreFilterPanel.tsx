"use client";

import {
  FREE_FROM_OPTIONS,
  CERTIFICATION_OPTIONS,
  PRICE_RANGE_OPTIONS,
  ExploreFilters,
  TierFilter,
  PriceRangeValue,
} from "@/lib/exploreConstants";

interface ExploreFilterPanelProps {
  filters: ExploreFilters;
  filterCounts: Record<string, number>;
  onChange: (update: Partial<ExploreFilters>) => void;
}

function FilterGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-4)] mb-2">
      {children}
    </p>
  );
}

export function ExploreFilterPanel({
  filters,
  filterCounts,
  onChange,
}: ExploreFilterPanelProps) {
  function toggleClaim(claim: string) {
    const next = filters.claims.includes(claim)
      ? filters.claims.filter((c) => c !== claim)
      : [...filters.claims, claim];
    onChange({ claims: next });
  }

  const tierOptions: { label: string; value: TierFilter }[] = [
    { label: "Clean",   value: "Clean" },
    { label: "Watch",   value: "Watch" },
    { label: "Caution", value: "Caution" },
  ];

  return (
    <div className="space-y-5">
      {/* Free-from */}
      <div>
        <FilterGroupLabel>Free-from</FilterGroupLabel>
        <ul className="space-y-1.5">
          {FREE_FROM_OPTIONS.map((opt) => {
            const count = filterCounts[opt.claim] ?? 0;
            const checked = filters.claims.includes(opt.claim);
            return (
              <li key={opt.claim}>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleClaim(opt.claim)}
                    className="w-4 h-4 rounded border-[var(--border)] accent-[var(--teal)] cursor-pointer"
                    data-claim={opt.claim}
                  />
                  <span className="text-sm text-[var(--ink)] group-hover:text-[var(--teal-dark)] transition-colors flex-1">
                    {opt.label}
                  </span>
                  <span className="text-xs text-[var(--ink-4)]">{count}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Certifications */}
      <div>
        <FilterGroupLabel>Certifications</FilterGroupLabel>
        <ul className="space-y-1.5">
          {CERTIFICATION_OPTIONS.map((opt) => {
            const count = filterCounts[opt.claim] ?? 0;
            const checked = filters.claims.includes(opt.claim);
            return (
              <li key={opt.claim}>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleClaim(opt.claim)}
                    className="w-4 h-4 rounded border-[var(--border)] accent-[var(--teal)] cursor-pointer"
                    data-claim={opt.claim}
                  />
                  <span className="text-sm text-[var(--ink)] group-hover:text-[var(--teal-dark)] transition-colors flex-1">
                    {opt.label}
                  </span>
                  <span className="text-xs text-[var(--ink-4)]">{count}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Score range */}
      <div>
        <FilterGroupLabel>Score range</FilterGroupLabel>
        <ul className="space-y-1.5">
          {tierOptions.map((opt) => (
            <li key={opt.value}>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="tier"
                  checked={filters.tier === opt.value}
                  onChange={() =>
                    onChange({ tier: filters.tier === opt.value ? null : opt.value })
                  }
                  onClick={() => {
                    if (filters.tier === opt.value) onChange({ tier: null });
                  }}
                  className="w-4 h-4 accent-[var(--teal)] cursor-pointer"
                />
                <span className="text-sm text-[var(--ink)] group-hover:text-[var(--teal-dark)] transition-colors">
                  {opt.label}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {/* Price range */}
      <div>
        <FilterGroupLabel>Price range</FilterGroupLabel>
        <ul className="space-y-1.5">
          {PRICE_RANGE_OPTIONS.map((opt) => (
            <li key={opt.value}>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="price"
                  checked={filters.priceRange === opt.value}
                  onChange={() =>
                    onChange({
                      priceRange: filters.priceRange === opt.value ? null : (opt.value as PriceRangeValue),
                    })
                  }
                  onClick={() => {
                    if (filters.priceRange === opt.value) onChange({ priceRange: null });
                  }}
                  className="w-4 h-4 accent-[var(--teal)] cursor-pointer"
                />
                <span className="text-sm text-[var(--ink)] group-hover:text-[var(--teal-dark)] transition-colors">
                  {opt.label}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {/* Clear all */}
      {(filters.claims.length > 0 || filters.tier || filters.priceRange) && (
        <button
          type="button"
          onClick={() => onChange({ claims: [], tier: null, priceRange: null })}
          className="text-xs text-[var(--teal-dark)] hover:text-[var(--teal)] transition-colors font-medium"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
