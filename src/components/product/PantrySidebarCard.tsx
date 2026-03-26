"use client";

import Link from "next/link";

interface PantrySidebarCardProps {
  inPantry: boolean | null | undefined;
  onAdd: () => void;
  onRemove: () => void;
  isAuthenticated: boolean;
}

export function PantrySidebarCard({
  inPantry,
  onAdd,
  onRemove,
  isAuthenticated,
}: PantrySidebarCardProps) {
  return (
    <div className="widget-card p-5" data-testid="pantry-sidebar-card">
      <p
        className="text-sm font-bold text-[var(--ink)] mb-1"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Add to your pantry
      </p>
      <p className="text-xs text-[var(--ink-3)] mb-4 leading-relaxed">
        Track this product and see how it affects your pantry health score.
      </p>

      {!isAuthenticated ? (
        <Link
          href="/login"
          className="block w-full py-2.5 rounded-xl bg-[var(--teal)] text-white text-sm font-semibold text-center hover:bg-[var(--teal-dark)] transition-colors"
        >
          Sign in to save
        </Link>
      ) : inPantry ? (
        <div className="space-y-2">
          <p className="text-xs text-[var(--teal-dark)] font-semibold flex items-center gap-1">
            <span>✓</span> Added to pantry
          </p>
          <button
            type="button"
            onClick={onRemove}
            className="w-full py-2 rounded-xl border border-[var(--surface-3)] text-xs text-[var(--ink-3)] hover:border-[var(--tier-avoid)] hover:text-[var(--tier-avoid)] transition-colors"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="w-full py-2.5 rounded-xl bg-[var(--teal)] text-white text-sm font-semibold hover:bg-[var(--teal-dark)] transition-colors"
        >
          + Add to pantry
        </button>
      )}
    </div>
  );
}
