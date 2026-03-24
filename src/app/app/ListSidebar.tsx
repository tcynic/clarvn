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
  onAdd: (name: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
}

export function ListSidebar({
  list,
  selectedName,
  onSelect,
  onRequest,
  onClear,
  onAdd,
  search,
  onSearchChange,
}: ListSidebarProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = search.trim();
    if (!name || list.some((i) => i.name === name)) return;
    onAdd(name);
    onSearchChange("");
  }

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

      {/* Quick-add form for unlisted products */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Add by name…"
          className="flex-1 border border-[var(--border)] rounded-[var(--radius-lg)] px-3 py-2 text-sm text-[var(--ink)] bg-white outline-none focus:border-[var(--teal)] transition-colors"
        />
        <button
          type="submit"
          disabled={!search.trim()}
          className="bg-[var(--teal)] text-white font-medium text-sm px-3 py-2 rounded-[var(--radius-lg)] hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {/* List items */}
      {list.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-2xl mb-2">🛒</p>
          <p className="text-xs text-[var(--ink-3)]">Browse products or add by name above.</p>
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
