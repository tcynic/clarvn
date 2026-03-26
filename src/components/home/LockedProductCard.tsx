"use client";

import Link from "next/link";

interface LockedProductCardProps {
  extraCount?: number;
  countLabel?: string; // default: "matches" (home page); use "results" for explore
  message?: string;   // optional override for the full message text
}

export function LockedProductCard({ extraCount, countLabel = "matches", message }: LockedProductCardProps) {
  return (
    <div className="product-card relative overflow-hidden select-none">
      {/* Blurred placeholder content */}
      <div className="product-card-image opacity-20">
        <span>🛒</span>
      </div>
      <div className="product-card-body opacity-20">
        <div className="h-3 bg-[var(--ink-4)] rounded w-3/4 mb-2" />
        <div className="h-3 bg-[var(--ink-4)] rounded w-1/2" />
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-[var(--radius-lg)] p-3 text-center">
        <span className="text-2xl mb-1">🔒</span>
        <p className="text-xs font-semibold text-[var(--ink)] leading-snug mb-2">
          {message ?? (extraCount ? `Unlock ${extraCount} more ${countLabel}` : `Unlock more ${countLabel}`)}
        </p>
        <Link
          href="/upgrade"
          className="text-xs font-medium text-white bg-[var(--teal)] px-3 py-1.5 rounded-[var(--radius)] hover:bg-[var(--teal-dark)] transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          Go Premium
        </Link>
      </div>
    </div>
  );
}
