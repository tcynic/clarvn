"use client";

import { ProductRow } from "./ProductRow";

interface ListItem {
  name: string;
  requestSent: boolean;
}

interface ListSidebarProps {
  list: ListItem[];
  selectedName: string | null;
  onSelect: (name: string | null) => void;
  onRequest: (name: string) => void;
  onClear: () => void;
}

export function ListSidebar({
  list,
  selectedName,
  onSelect,
  onRequest,
  onClear,
}: ListSidebarProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm text-[var(--ink)]" style={{ fontFamily: "var(--font-serif)" }}>
          My List
          {list.length > 0 && (
            <span className="ml-2 text-xs font-normal text-[var(--ink-3)]">({list.length})</span>
          )}
        </h2>
        {list.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-[var(--ink-3)] hover:text-[var(--tier-avoid)] transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* List items */}
      {list.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-2xl mb-2">🛒</p>
          <p className="text-xs text-[var(--ink-3)]">Browse products to add them to your list.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((item) => (
            <ProductRow
              key={item.name}
              item={item}
              isSelected={selectedName === item.name}
              onSelect={() => onSelect(selectedName === item.name ? null : item.name)}
              onRequest={() => onRequest(item.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
