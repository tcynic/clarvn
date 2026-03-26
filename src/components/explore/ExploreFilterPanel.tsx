"use client";

import { useState } from "react";
import {
  FREE_FROM_OPTIONS,
  CERTIFICATION_OPTIONS,
  PRICE_RANGE_OPTIONS,
  ExploreFilters,
  TierFilter,
  PriceRangeValue,
} from "@/lib/exploreConstants";
import { GATE_COPY, PREMIUM_FILTER_COUNT } from "@/lib/gateConstants";

interface ExploreFilterPanelProps {
  filters: ExploreFilters;
  filterCounts: Record<string, number>;
  onChange: (update: Partial<ExploreFilters>) => void;
  isPremium?: boolean;
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
  isPremium = false,
}: ExploreFilterPanelProps) {
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);
  const [lockedPriceMessage, setLockedPriceMessage] = useState(false);

  function toggleClaim(claim: string) {
    const next = filters.claims.includes(claim)
      ? filters.claims.filter((c) => c !== claim)
      : [...filters.claims, claim];
    onChange({ claims: next });
  }

  function handlePremiumFilterClick(filterLabel: string) {
    const msg = GATE_COPY.premiumFilter(filterLabel, PREMIUM_FILTER_COUNT - 1);
    setLockedMessage(msg);
    setTimeout(() => setLockedMessage(null), 3000);
  }

  function handlePremiumPriceClick() {
    setLockedPriceMessage(true);
    setTimeout(() => setLockedPriceMessage(false), 3000);
  }

  const tierOptions: { label: string; value: TierFilter }[] = [
    { label: "Clean",   value: "Clean" },
    { label: "Watch",   value: "Watch" },
    { label: "Caution", value: "Caution" },
  ];

  return (
    <div className="space-y-5">
      {/* Free-from — all premium */}
      <div>
        <FilterGroupLabel>Free-from</FilterGroupLabel>
        <ul className="space-y-1.5">
          {FREE_FROM_OPTIONS.map((opt) => {
            const count = filterCounts[opt.claim] ?? 0;
            const checked = filters.claims.includes(opt.claim);
            const locked = opt.premium && !isPremium;

            return (
              <li key={opt.claim}>
                {locked ? (
                  <button
                    type="button"
                    onClick={() => handlePremiumFilterClick(opt.label)}
                    className="w-full flex items-center gap-2 opacity-50 cursor-pointer group"
                    aria-label={`${opt.label} — Premium filter`}
                  >
                    <span className="w-4 h-4 rounded border border-[var(--border)] flex items-center justify-center shrink-0 bg-[var(--surface-2)]">
                      <span className="text-[9px] text-[var(--ink-4)]">🔒</span>
                    </span>
                    <span className="text-sm text-[var(--ink-3)] flex-1 text-left">{opt.label}</span>
                    <span className="text-xs text-[var(--ink-4)]">{count}</span>
                  </button>
                ) : (
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
                )}
              </li>
            );
          })}
        </ul>
        {/* Inline lock message for free-from — auto-dismisses */}
        {lockedMessage && (
          <p className="mt-2 text-xs text-[var(--ink-3)] bg-[var(--surface-2)] rounded-lg px-2.5 py-2 leading-snug">
            {lockedMessage}{" "}
            <a href="/upgrade" className="underline text-[var(--teal-dark)] font-medium">Upgrade</a>
          </p>
        )}
      </div>

      {/* Certifications — free filters */}
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

      {/* Score range — free filter */}
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

      {/* Price range — premium filter */}
      <div>
        <FilterGroupLabel>
          Price range
          {!isPremium && (
            <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wide text-[var(--ink-4)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded-full">
              Premium
            </span>
          )}
        </FilterGroupLabel>
        {!isPremium ? (
          <>
            <ul className="space-y-1.5 opacity-50">
              {PRICE_RANGE_OPTIONS.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={handlePremiumPriceClick}
                    className="w-full flex items-center gap-2 cursor-pointer"
                    aria-label={`${opt.label} — Premium filter`}
                  >
                    <span className="w-4 h-4 rounded-full border border-[var(--border)] flex items-center justify-center shrink-0 bg-[var(--surface-2)]">
                      <span className="text-[9px] text-[var(--ink-4)]">🔒</span>
                    </span>
                    <span className="text-sm text-[var(--ink-3)]">{opt.label}</span>
                  </button>
                </li>
              ))}
            </ul>
            {lockedPriceMessage && (
              <p className="mt-2 text-xs text-[var(--ink-3)] bg-[var(--surface-2)] rounded-lg px-2.5 py-2 leading-snug">
                {GATE_COPY.premiumFilter("Price range", PREMIUM_FILTER_COUNT - 1)}{" "}
                <a href="/upgrade" className="underline text-[var(--teal-dark)] font-medium">Upgrade</a>
              </p>
            )}
          </>
        ) : (
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
        )}
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
