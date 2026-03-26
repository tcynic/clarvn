"use client";

import { FilterPill } from "@/components/ui/FilterPill";
import { CATEGORY_OPTIONS } from "@/lib/exploreConstants";

interface CategoryPillRowProps {
  selectedLabel: string;
  onChange: (value: string | null, subcategory: string | null) => void;
}

export function CategoryPillRow({ selectedLabel, onChange }: CategoryPillRowProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="group" aria-label="Category filter">
      {CATEGORY_OPTIONS.map((opt) => (
        <FilterPill
          key={opt.label}
          label={opt.label}
          active={selectedLabel === opt.label}
          onClick={() => onChange(opt.value, opt.subcategory)}
          className="shrink-0"
        />
      ))}
    </div>
  );
}
