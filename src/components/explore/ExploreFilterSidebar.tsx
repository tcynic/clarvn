import { ExploreFilterPanel } from "./ExploreFilterPanel";
import { ExploreFilters } from "@/lib/exploreConstants";

interface ExploreFilterSidebarProps {
  filters: ExploreFilters;
  filterCounts: Record<string, number>;
  onChange: (update: Partial<ExploreFilters>) => void;
  isPremium?: boolean;
}

export function ExploreFilterSidebar({ filters, filterCounts, onChange, isPremium = false }: ExploreFilterSidebarProps) {
  return (
    <aside className="hidden md:block w-52 shrink-0">
      <div className="sticky top-20">
        <p className="text-sm font-semibold text-[var(--ink)] mb-4">Filters</p>
        <ExploreFilterPanel
          filters={filters}
          filterCounts={filterCounts}
          onChange={onChange}
          isPremium={isPremium}
        />
      </div>
    </aside>
  );
}
