"use client";

import { SORT_OPTIONS, SortValue } from "@/lib/exploreConstants";

interface ExploreHeaderProps {
  totalCount: number;
  cappedForFree: boolean;
  sort: SortValue;
  onSortChange: (sort: SortValue) => void;
  onOpenFilters: () => void;
}

export function ExploreHeader({
  totalCount,
  cappedForFree,
  sort,
  onSortChange,
  onOpenFilters,
}: ExploreHeaderProps) {
  return (
    <div className="mb-4">
      <h1
        className="text-2xl font-semibold text-[var(--ink)] mb-1"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Best Clean Food Products
      </h1>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-[var(--ink-3)]">
          {cappedForFree
            ? `Showing 6 of ${totalCount}+ products`
            : `Showing ${totalCount} product${totalCount !== 1 ? "s" : ""}`}
        </p>

        <div className="flex items-center gap-2">
          {/* Mobile filter button */}
          <button
            type="button"
            onClick={onOpenFilters}
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors"
            aria-label="Open filters"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Filters
          </button>

          {/* Sort dropdown */}
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortValue)}
            className="text-sm border border-[var(--border)] rounded-lg px-2 py-1.5 bg-white text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)] cursor-pointer"
            aria-label="Sort products"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
