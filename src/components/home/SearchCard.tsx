"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilterPill } from "@/components/ui/FilterPill";

const SEARCH_CHIPS = [
  { label: "Scan barcode", mode: "scan" },
  { label: "Image search", mode: "image" },
  { label: "Find safer swaps", mode: "swaps" },
  { label: "Filters", mode: "filters" },
];

export function SearchCard() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch() {
    if (!query.trim()) return;
    router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSearch();
  }

  return (
    <div className="widget-card">
      {/* Search input */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search products or ingredients…"
          className="flex-1 text-sm border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--teal)] focus:border-transparent"
        />
        <button
          type="button"
          onClick={handleSearch}
          className="bg-[var(--teal)] text-white text-sm font-medium px-4 py-2 rounded-[var(--radius)] hover:bg-[var(--teal-dark)] transition-colors"
        >
          Search
        </button>
      </div>

      {/* Quick-action chips */}
      <div className="flex flex-wrap gap-2">
        {SEARCH_CHIPS.map((chip) => (
          <FilterPill
            key={chip.mode}
            label={chip.label}
            active={false}
            onClick={() => router.push(`/explore?mode=${chip.mode}`)}
          />
        ))}
      </div>
    </div>
  );
}
