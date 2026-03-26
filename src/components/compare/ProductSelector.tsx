"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface ProductOption {
  id: string;
  name: string;
  brand?: string;
  emoji?: string;
  imageUrl?: string;
  baseScore?: number;
  tier?: string;
}

interface ProductSelectorProps {
  selectedIds: string[];
  onAdd: (product: ProductOption) => void;
  onRemove: (id: string) => void;
  maxProducts?: number;
}

export function ProductSelector({
  selectedIds,
  onAdd,
  onRemove,
  maxProducts = 4,
}: ProductSelectorProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const results = useQuery(
    api.compare.searchProductsForCompare,
    query.trim().length >= 2 ? { query: query.trim() } : "skip"
  );

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const canAdd = selectedIds.length < maxProducts;

  return (
    <div className="space-y-3">
      {/* Selected chips */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {/* ProductSelector renders chips based on parent state; parent tracks product objects */}
        </div>
      )}

      {/* Search input */}
      {canAdd && (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search products to compare…"
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--surface-3)] bg-white text-sm text-[var(--ink)] placeholder-[var(--ink-4)] focus:outline-none focus:border-[var(--teal)] transition-colors"
          />

          {open && results && results.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-[var(--surface-2)] z-20 overflow-hidden"
            >
              {results
                .filter((r) => !selectedIds.includes(r.id))
                .slice(0, 6)
                .map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface)] transition-colors text-left"
                    onClick={() => {
                      onAdd(product as ProductOption);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    <span className="text-xl w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--surface-2)] shrink-0">
                      {product.emoji ?? "🛒"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--ink)] truncate">{product.name}</p>
                      <p className="text-xs text-[var(--ink-4)] truncate">{product.brand}</p>
                    </div>
                    {product.baseScore !== undefined && (
                      <span className="ml-auto text-xs font-semibold text-[var(--ink-3)] shrink-0">
                        {product.baseScore.toFixed(1)}
                      </span>
                    )}
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ProductChipProps {
  name: string;
  emoji?: string;
  onRemove: () => void;
}

export function ProductChip({ name, emoji, onRemove }: ProductChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--teal-light)] text-[var(--teal-dark)] text-sm font-medium">
      {emoji && <span>{emoji}</span>}
      <span className="max-w-[120px] truncate">{name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-[var(--teal-dark)] hover:text-[var(--tier-avoid)] transition-colors ml-0.5"
        aria-label={`Remove ${name}`}
      >
        ×
      </button>
    </span>
  );
}
