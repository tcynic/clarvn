"use client";

import { ExploreFilterPanel } from "./ExploreFilterPanel";
import { ExploreFilters } from "@/lib/exploreConstants";

interface ExploreFilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: ExploreFilters;
  filterCounts: Record<string, number>;
  onChange: (update: Partial<ExploreFilters>) => void;
}

export function ExploreFilterSheet({
  open,
  onClose,
  filters,
  filterCounts,
  onChange,
}: ExploreFilterSheetProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white rounded-t-2xl shadow-xl max-h-[80vh] overflow-y-auto"
        role="dialog"
        aria-label="Filter products"
        aria-modal="true"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>

        <div className="px-5 pb-8 pt-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-base font-semibold text-[var(--ink)]">Filters</p>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
            >
              Done
            </button>
          </div>
          <ExploreFilterPanel
            filters={filters}
            filterCounts={filterCounts}
            onChange={onChange}
          />
        </div>
      </div>
    </>
  );
}
